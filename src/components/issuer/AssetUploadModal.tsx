// src/components/issuer/AssetUploadModal.tsx
import { useState, useRef } from 'react';
import { X, Upload, FileText, Building2, Settings, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { assetService } from '../../lib/api/asset.service';

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  // File
  file: File | null;

  // Step 1: Basic Information
  invoiceNumber: string;
  faceValue: string;
  currency: string;
  issueDate: string;
  dueDate: string;

  // Step 2: Buyer & Risk
  buyerName: string;
  industry: string;
  riskTier: string;

  // Step 3: Asset Configuration
  assetType: 'AUCTION' | 'STATIC';
  totalSupply: string;
  minInvestment: string;

  // Step 4: Auction Settings (only if AUCTION)
  minRaisePercentage: string;
  maxRaisePercentage: string;
  auctionDuration: string; // stored as seconds (to send to backend)
  auctionDays: string;
  auctionHours: string;
  auctionMinutes: string;
  auctionSeconds: string;
}

const INITIAL_FORM_DATA: FormData = {
  file: null,
  invoiceNumber: '',
  faceValue: '',
  currency: 'USD',
  issueDate: '',
  dueDate: '',
  buyerName: '',
  industry: '',
  riskTier: 'Low',
  assetType: 'STATIC',
  totalSupply: '',
  minInvestment: '',
  minRaisePercentage: '75', // 75% for STATIC (leaving room for platform fees 1.5% and yield)
  maxRaisePercentage: '95', // 95% for STATIC (default placeholder as per script)
  auctionDuration: '300', // stored in seconds for backend
  auctionDays: '0',
  auctionHours: '0',
  auctionMinutes: '5', // default 5 minutes
  auctionSeconds: '0',
};

export const AssetUploadModal = ({ isOpen, onClose, onSuccess }: AssetUploadModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = formData.assetType === 'AUCTION' ? 4 : 3;

  if (!isOpen) return null;

  // Handle file upload
  const handleFileChange = (file: File | null) => {
    if (file && file.type === 'application/pdf') {
      setFormData({ ...formData, file });
      setError(null);
    } else if (file) {
      setError('Please upload a PDF file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  // Update form field
  const updateField = (field: keyof FormData, value: string | File | null) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  // Calculate total seconds from days, hours, minutes, seconds
  const calculateTotalSeconds = (days: string, hours: string, minutes: string, seconds: string): string => {
    const d = parseInt(days) || 0;
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;

    const total = (d * 24 * 60 * 60) + (h * 60 * 60) + (m * 60) + s;
    return total.toString();
  };

  // Update individual duration field and recalculate total seconds
  const updateDurationField = (field: 'auctionDays' | 'auctionHours' | 'auctionMinutes' | 'auctionSeconds', value: string) => {
    // Only allow non-negative integers
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, numValue).toString();

    const newFormData = { ...formData, [field]: value === '' ? '0' : clampedValue };

    // Recalculate total seconds
    const totalSeconds = calculateTotalSeconds(
      field === 'auctionDays' ? newFormData.auctionDays : formData.auctionDays,
      field === 'auctionHours' ? newFormData.auctionHours : formData.auctionHours,
      field === 'auctionMinutes' ? newFormData.auctionMinutes : formData.auctionMinutes,
      field === 'auctionSeconds' ? newFormData.auctionSeconds : formData.auctionSeconds
    );

    newFormData.auctionDuration = totalSeconds;
    setFormData(newFormData);
    setError(null);
  };

  // Validate current step
  const validateStep = (): boolean => {
    if (currentStep === 1) {
      if (!formData.file) {
        setError('Please upload an invoice file');
        return false;
      }
      if (!formData.invoiceNumber || !formData.faceValue || !formData.issueDate || !formData.dueDate) {
        setError('Please fill in all required fields');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.buyerName || !formData.industry) {
        setError('Please fill in all required fields');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.totalSupply || !formData.minInvestment || !formData.minRaisePercentage || !formData.maxRaisePercentage) {
        setError('Please fill in all required fields');
        return false;
      }
      // Validate raise percentages
      const minRaise = parseFloat(formData.minRaisePercentage);
      const maxRaise = parseFloat(formData.maxRaisePercentage);
      if (minRaise < 0 || minRaise > 100 || maxRaise < 0 || maxRaise > 100) {
        setError('Raise percentages must be between 0 and 100');
        return false;
      }
      if (minRaise > maxRaise) {
        setError('Min raise % cannot be greater than max raise %');
        return false;
      }
    } else if (currentStep === 4 && formData.assetType === 'AUCTION') {
      const totalSeconds = parseInt(formData.auctionDuration);
      if (isNaN(totalSeconds) || totalSeconds <= 0) {
        setError('Please enter a valid auction duration (at least 1 second)');
        return false;
      }
    }
    setError(null);
    return true;
  };

  // Navigate steps
  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setError(null);
  };

  // Helper: Convert tokens to wei (multiply by 10^18)
  const tokensToWei = (tokens: string): string => {
    if (!tokens || tokens === '') return '0';
    const tokenAmount = parseFloat(tokens);
    if (isNaN(tokenAmount)) return '0';
    // Multiply by 10^18 and convert to string without scientific notation
    const weiAmount = BigInt(Math.floor(tokenAmount)) * BigInt('1000000000000000000');
    return weiAmount.toString();
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formDataToSubmit = new FormData();

      if (formData.file) {
        formDataToSubmit.append('file', formData.file);
      }

      formDataToSubmit.append('invoiceNumber', formData.invoiceNumber);
      formDataToSubmit.append('faceValue', formData.faceValue);
      formDataToSubmit.append('currency', formData.currency);
      formDataToSubmit.append('issueDate', formData.issueDate);
      formDataToSubmit.append('dueDate', formData.dueDate);
      formDataToSubmit.append('buyerName', formData.buyerName);
      formDataToSubmit.append('industry', formData.industry);
      formDataToSubmit.append('riskTier', formData.riskTier);
      formDataToSubmit.append('assetType', formData.assetType);

      // Convert tokens to wei before sending
      const totalSupplyWei = tokensToWei(formData.totalSupply);
      const minInvestmentWei = tokensToWei(formData.minInvestment);

      console.log('📊 Token Conversion:');
      console.log('  Total Supply: ', formData.totalSupply, 'tokens →', totalSupplyWei, 'wei');
      console.log('  Min Investment:', formData.minInvestment, 'tokens →', minInvestmentWei, 'wei');

      formDataToSubmit.append('totalSupply', totalSupplyWei);
      formDataToSubmit.append('minInvestment', minInvestmentWei);

      // IMPORTANT: Both STATIC and AUCTION need minRaise/maxRaise percentages
      formDataToSubmit.append('minRaisePercentage', formData.minRaisePercentage);
      formDataToSubmit.append('maxRaisePercentage', formData.maxRaisePercentage);

      // Only AUCTION needs duration
      if (formData.assetType === 'AUCTION') {
        formDataToSubmit.append('auctionDuration', formData.auctionDuration);
      }

      await assetService.uploadAsset(formDataToSubmit);

      // Success! Show confirmation
      setShowSuccess(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setFormData(INITIAL_FORM_DATA);
        setCurrentStep(1);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload asset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close modal
  const handleClose = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setError(null);
    onClose();
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: 'File & Info', icon: FileText },
      { number: 2, title: 'Buyer & Risk', icon: Building2 },
      { number: 3, title: 'Configuration', icon: Settings },
    ];

    if (formData.assetType === 'AUCTION') {
      steps.push({ number: 4, title: 'Auction', icon: Settings });
    }

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-green-100 border-2 border-green-500'
                      : isActive
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-100 border-2 border-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Icon
                      className={`w-6 h-6 ${
                        isActive ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`font-geist text-xs mt-2 ${
                    isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render step 1: File Upload & Basic Info
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* File Upload */}
      <div>
        <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
          Invoice File (PDF) <span className="text-red-500">*</span>
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : formData.file
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          {formData.file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <p className="font-geist text-sm font-semibold text-green-700">
                  {formData.file.name}
                </p>
                <p className="font-geist text-xs text-gray-500">
                  {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => handleFileChange(null)}
                className="ml-4 text-red-500 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="font-geist text-sm text-gray-600 mb-2">
                Drag & drop your invoice PDF here
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-geist text-sm hover:bg-blue-700 transition-colors"
              >
                Choose File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
            Invoice Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.invoiceNumber}
            onChange={(e) => updateField('invoiceNumber', e.target.value)}
            placeholder="INV-2024-001"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
            Face Value <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.faceValue}
            onChange={(e) => updateField('faceValue', e.target.value)}
            placeholder="100000"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
            Currency <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.currency}
            onChange={(e) => updateField('currency', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div>
          <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
            Issue Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.issueDate}
            onChange={(e) => updateField('issueDate', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => updateField('dueDate', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  // Render step 2: Buyer & Risk
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
          Buyer Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.buyerName}
          onChange={(e) => updateField('buyerName', e.target.value)}
          placeholder="Acme Corporation"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
          Industry <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.industry}
          onChange={(e) => updateField('industry', e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Industry</option>
          <option value="Technology">Technology</option>
          <option value="Manufacturing">Manufacturing</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Retail">Retail</option>
          <option value="Construction">Construction</option>
          <option value="Energy">Energy</option>
          <option value="Finance">Finance</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
          Risk Tier <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['Low', 'Medium', 'High'].map((tier) => (
            <button
              key={tier}
              onClick={() => updateField('riskTier', tier)}
              className={`px-4 py-3 rounded-lg font-geist text-sm font-medium transition-all ${
                formData.riskTier === tier
                  ? 'bg-blue-600 text-white border-2 border-blue-600'
                  : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-blue-400'
              }`}
            >
              {tier} Risk
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render step 3: Asset Configuration
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
          Asset Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          {(['STATIC', 'AUCTION'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateField('assetType', type)}
              className={`px-6 py-4 rounded-lg font-geist text-sm font-medium transition-all ${
                formData.assetType === type
                  ? 'bg-blue-600 text-white border-2 border-blue-600'
                  : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-blue-400'
              }`}
            >
              <div className="text-lg mb-1">
                {type === 'STATIC' ? '📊' : '🔨'}
              </div>
              {type === 'STATIC' ? 'Fixed Price' : 'Auction'}
              <div className="text-xs mt-1 opacity-80">
                {type === 'STATIC' ? 'Static listing' : 'Competitive bidding'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
            Total Supply (Tokens) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.totalSupply}
            onChange={(e) => updateField('totalSupply', e.target.value)}
            placeholder="100000"
            min="0"
            step="1"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="font-geist text-xs text-gray-500 mt-1">
            Number of tokens to issue (e.g., 100000 for 100,000 tokens)
          </p>
        </div>

        <div>
          <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
            Minimum Investment (Tokens) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.minInvestment}
            onChange={(e) => updateField('minInvestment', e.target.value)}
            placeholder="1000"
            min="0"
            step="1"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="font-geist text-xs text-gray-500 mt-1">
            Minimum tokens an investor must buy (e.g., 1000 tokens)
          </p>
        </div>
      </div>

      {/* Raise Percentages - Required for BOTH STATIC and AUCTION */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-geist text-sm text-blue-800 mb-4">
          <strong>Raise Limits:</strong> Set minimum and maximum fundraise as % of face value.
          {formData.assetType === 'STATIC' && ' For static assets, 95% max leaves room for platform fees (1.5%) and investor yield.'}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
              Min Raise % <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.minRaisePercentage}
              onChange={(e) => updateField('minRaisePercentage', e.target.value)}
              placeholder="75"
              min="0"
              max="100"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="font-geist text-xs text-gray-500 mt-1">
              Minimum % of face value to raise
            </p>
          </div>

          <div>
            <label className="block font-geist text-sm font-medium text-gray-700 mb-2">
              Max Raise % <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.maxRaisePercentage}
              onChange={(e) => {
              const value = e.target.value;
              const numValue = parseInt(value, 10);
              
              // Only accept integers
              if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 95)) {
                updateField('maxRaisePercentage', value === '' ? '' : numValue.toString());
              } else if (numValue > 95) {
                updateField('maxRaisePercentage', '95');
              }
              }}
              onKeyDown={(e) => {
              // Prevent arrow up if already at 95
              if (e.key === 'ArrowUp') {
                const currentValue = parseInt(formData.maxRaisePercentage, 10) || 0;
                if (currentValue >= 95) {
                e.preventDefault();
                }
              }
              }}
              placeholder="95"
              min="0"
              max="95"
              step="1"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg font-geist text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="font-geist text-xs text-gray-500 mt-1">
              Maximum % of face value to raise
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render step 4: Auction Settings (only for AUCTION type)
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <p className="font-geist text-sm text-orange-800">
          <strong>🔨 Auction Configuration:</strong> Set the duration for competitive bidding.
          Raise percentages were already configured in Step 3.
        </p>
      </div>

      <div>
        <label className="block font-geist text-sm font-medium text-gray-700 mb-3">
          Auction Duration <span className="text-red-500">*</span>
        </label>
        <p className="font-geist text-xs text-gray-600 mb-3">
          Set how long the auction will run. You can use any combination of time units.
        </p>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block font-geist text-xs font-medium text-gray-600 mb-1">
              Days
            </label>
            <input
              type="number"
              value={formData.auctionDays}
              onChange={(e) => updateDurationField('auctionDays', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-geist text-xs font-medium text-gray-600 mb-1">
              Hours
            </label>
            <input
              type="number"
              value={formData.auctionHours}
              onChange={(e) => updateDurationField('auctionHours', e.target.value)}
              placeholder="0"
              min="0"
              max="23"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-geist text-xs font-medium text-gray-600 mb-1">
              Minutes
            </label>
            <input
              type="number"
              value={formData.auctionMinutes}
              onChange={(e) => updateDurationField('auctionMinutes', e.target.value)}
              placeholder="0"
              min="0"
              max="59"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-geist text-xs font-medium text-gray-600 mb-1">
              Seconds
            </label>
            <input
              type="number"
              value={formData.auctionSeconds}
              onChange={(e) => updateDurationField('auctionSeconds', e.target.value)}
              placeholder="0"
              min="0"
              max="59"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="font-geist text-sm font-medium text-blue-900">
              Total Duration:
            </p>
            <p className="font-mono text-lg font-semibold text-blue-700">
              {formData.auctionDays}d {formData.auctionHours}h {formData.auctionMinutes}m {formData.auctionSeconds}s
            </p>
          </div>
          <p className="font-geist text-xs text-blue-700 mt-2">
            = {formData.auctionDuration} seconds total
          </p>
        </div>
      </div>

      {/* Summary of configured raise percentages */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="font-geist text-sm font-semibold text-gray-700 mb-2">
          Configured Raise Limits:
        </p>
        <div className="grid grid-cols-2 gap-4 font-geist text-sm">
          <div>
            <span className="text-gray-600">Min Raise:</span>
            <span className="font-semibold text-gray-800 ml-2">{formData.minRaisePercentage}%</span>
          </div>
          <div>
            <span className="text-gray-600">Max Raise:</span>
            <span className="font-semibold text-gray-800 ml-2">{formData.maxRaisePercentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 p-0 sm:p-4 flex items-end sm:items-center justify-center">
      {/* Success Notification Overlay */}
      {showSuccess && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="font-geist text-2xl font-semibold text-foreground mb-2">
              Asset Submitted Successfully!
            </h3>
            <p className="font-inter text-sm text-foreground/70">
              Your asset has been uploaded and will be processed shortly.
            </p>
          </div>
        </div>
      )}

      <div className="bg-[#f6fbff] w-full h-full sm:max-w-3xl sm:max-h-[90vh] sm:h-auto sm:rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between">
          <div>
            <h2 className="font-geist text-2xl font-semibold text-foreground">
              Upload New Asset
            </h2>
            <p className="font-geist text-sm text-gray-500 mt-1">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-white border-b border-gray-200 overflow-x-auto">
          <div className="min-w-max">
            {renderStepIndicator()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && formData.assetType === 'AUCTION' && renderStep4()}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-geist text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-4 sm:px-8 py-4 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:gap-0 sm:items-center sm:justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-geist text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex relative items-center gap-3">
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg font-geist text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit Asset
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
