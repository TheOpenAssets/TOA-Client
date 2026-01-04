import { useState } from 'react';
import { X, FileText, Building2, Settings, CheckCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { assetService } from '../../lib/api/asset.service';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { FileUpload } from '../ui/file-upload';
import { cn } from '../../lib/utils';

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  file: File | null;
  invoiceNumber: string;
  faceValue: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  buyerName: string;
  industry: string;
  riskTier: string;
  assetType: 'AUCTION' | 'STATIC';
  totalSupply: string;
  minInvestment: string;
  minRaisePercentage: string;
  maxRaisePercentage: string;
  auctionDuration: string;
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
  minRaisePercentage: '75',
  maxRaisePercentage: '95',
  auctionDuration: '300',
  auctionDays: '0',
  auctionHours: '0',
  auctionMinutes: '5',
  auctionSeconds: '0',
};

export const AssetUploadModal = ({ isOpen, onClose, onSuccess }: AssetUploadModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const totalSteps = formData.assetType === 'AUCTION' ? 4 : 3;

  if (!isOpen) return null;

  const handleFileChange = (file: File | null) => {
    if (file && file.type === 'application/pdf') {
      setFormData({ ...formData, file });
      setError(null);
    } else if (file) {
      setError('Please upload a PDF file');
    }
  };

  const updateField = (field: keyof FormData, value: string | File | null) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  const calculateTotalSeconds = (days: string, hours: string, minutes: string, seconds: string): string => {
    const d = parseInt(days) || 0;
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    return ((d * 86400) + (h * 3600) + (m * 60) + s).toString();
  };

  const updateDurationField = (field: 'auctionDays' | 'auctionHours' | 'auctionMinutes' | 'auctionSeconds', value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, numValue).toString();
    const newFormData = { ...formData, [field]: value === '' ? '0' : clampedValue };
    newFormData.auctionDuration = calculateTotalSeconds(
      field === 'auctionDays' ? newFormData.auctionDays : formData.auctionDays,
      field === 'auctionHours' ? newFormData.auctionHours : formData.auctionHours,
      field === 'auctionMinutes' ? newFormData.auctionMinutes : formData.auctionMinutes,
      field === 'auctionSeconds' ? newFormData.auctionSeconds : formData.auctionSeconds
    );
    setFormData(newFormData);
  };

  const validateStep = (): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!formData.file) { setError('Please upload an invoice file. The format must be a pdf'); return false; }
      if (!formData.invoiceNumber || !formData.faceValue || !formData.issueDate || !formData.dueDate) {
        setError('Please fill in all required fields'); return false;
      }
    } else if (currentStep === 2) {
      if (!formData.buyerName || !formData.industry) { setError('Please fill in all required fields'); return false; }
    } else if (currentStep === 3) {
      if (!formData.totalSupply || !formData.minInvestment || !formData.minRaisePercentage || !formData.maxRaisePercentage) {
        setError('Please fill in all required fields'); return false;
      }
      const minRaise = parseFloat(formData.minRaisePercentage);
      const maxRaise = parseFloat(formData.maxRaisePercentage);
      if (minRaise < 0 || minRaise > 100 || maxRaise < 0 || maxRaise > 100 || minRaise > maxRaise) {
        setError('Please enter valid raise percentages (Min cannot exceed Max)'); return false;
      }
    } else if (currentStep === 4 && formData.assetType === 'AUCTION') {
      if (parseInt(formData.auctionDuration) <= 0) { setError('Auction duration must be at least 1 second'); return false; }
    }
    return true;
  };

  const handleNext = () => { if (validateStep()) setCurrentStep(v => v + 1); };
  const handlePrevious = () => setCurrentStep(v => v - 1);

  const tokensToWei = (tokens: string): string => {
    if (!tokens) return '0';
    const weiAmount = BigInt(Math.floor(parseFloat(tokens))) * BigInt('1000000000000000000');
    return weiAmount.toString();
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
      const data = new FormData();
      if (formData.file) data.append('file', formData.file);
      ['invoiceNumber', 'faceValue', 'currency', 'issueDate', 'dueDate', 'buyerName', 'industry', 'riskTier', 'assetType', 'minRaisePercentage', 'maxRaisePercentage'].forEach(key => {
        data.append(key, (formData as any)[key]);
      });
      data.append('totalSupply', tokensToWei(formData.totalSupply));
      data.append('minInvestment', tokensToWei(formData.minInvestment));
      if (formData.assetType === 'AUCTION') data.append('auctionDuration', formData.auctionDuration);

      await assetService.uploadAsset(data);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
        onClose();
        setFormData(INITIAL_FORM_DATA);
        setCurrentStep(1);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { n: 1, t: 'File', i: FileText },
      { n: 2, t: 'Risk', i: Building2 },
      { n: 3, t: 'Config', i: Settings },
      ...(formData.assetType === 'AUCTION' ? [{ n: 4, t: 'Auction', i: Clock }] : [])
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((s, idx) => (
          <div key={s.n} className="flex items-center">
            <div className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-300 border",
              currentStep === s.n ? "bg-slate-900 text-white border-slate-900 shadow-md" :
                currentStep > s.n ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-slate-400 border-slate-200"
            )}>
              {currentStep > s.n ? <CheckCircle className="w-4 h-4" /> : <s.i className="w-4 h-4" />}
              <span className="text-xs font-medium font-geist uppercase tracking-wider">{s.t}</span>
            </div>
            {idx < steps.length - 1 && <div className={cn("w-8 h-[1px] mx-2", currentStep > s.n ? "bg-emerald-200" : "bg-slate-200")} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-200/50 z-50 flex items-center justify-center backdrop-blur-md p-4">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 bg-white/95 backdrop-blur-xl flex items-center justify-center z-[60] rounded-3xl"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-emerald-100 shadow-lg">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 font-geist">Submission Received</h3>
              <p className="text-slate-500 font-geist">Processing your asset listing now...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-geist">Upload Asset</h2>
            <p className="text-slate-500 text-sm font-geist mt-1">Complete the details to tokenize your invoice</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">
          {renderStepIndicator()}

          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="group">
                <Label className="text-black font-bold mb-3 block text-xs uppercase tracking-widest">Invoice Document</Label>
                <div className="rounded-2xl p-1 transition-colors bg-slate-50/50">
                  <FileUpload onChange={(f) => handleFileChange(f[0])} text="Upload your Invoice here" />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-geist text-center uppercase tracking-wider">PDF format supported • Max 10MB</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <MinimalInput label="Invoice Number" id="invoiceNumber" value={formData.invoiceNumber} onChange={(v:any) => updateField('invoiceNumber', v)} placeholder="e.g. INV-2024-001" />
                <MinimalInput label="Face Value" id="faceValue" type="number" value={formData.faceValue} onChange={(v:any) => updateField('faceValue', v)} placeholder="e.g. 50000.00" />
                <div className="space-y-2">
                  <Label className="text-black font-bold text-xs uppercase tracking-widest">Currency</Label>
                  <div className="relative">
                    <select
                      value={formData.currency}
                      onChange={(e) => updateField('currency', e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-geist text-slate-900 focus:ring-2 focus:ring-slate-900/5 transition-all outline-none appearance-none hover:bg-slate-100 cursor-pointer"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>
                <MinimalInput label="Issue Date" id="issueDate" type="date" value={formData.issueDate} onChange={(v: any) => updateField('issueDate', v)} />
                <div className="col-span-2">
                  <MinimalInput label="Due Date" id="dueDate" type="date" value={formData.dueDate} onChange={(v:any) => updateField('dueDate', v)} />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <MinimalInput label="Buyer Name" id="buyerName" value={formData.buyerName} onChange={(v:any) => updateField('buyerName', v)} placeholder="e.g. Acme Corporation Global" />
              <div className="space-y-2">
                <Label className="text-black font-bold text-xs uppercase tracking-widest">Industry</Label>
                <div className="relative">
                  <select
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-geist text-slate-900 focus:ring-2 focus:ring-slate-900/5 outline-none appearance-none hover:bg-slate-100 cursor-pointer"
                  >
                    <option value="" disabled>Select Industry Sector</option>
                    {['Technology', 'Manufacturing', 'Healthcare', 'Retail', 'Finance', 'Logistics', 'Energy', 'Real Estate'].map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-black font-bold text-xs uppercase tracking-widest">Risk Assessment</Label>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {['Low', 'Medium', 'High'].map((tier) => (
                    <button
                      key={tier} onClick={() => updateField('riskTier', tier)}
                      className={cn(
                        "py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border-2",
                        formData.riskTier === tier
                          ? "bg-slate-900 border-slate-900 text-white shadow-lg -translate-y-1"
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 text-center font-geist">Select the risk tier based on buyer creditworthiness</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-2 gap-4">
                {['STATIC', 'AUCTION'].map((type) => (
                  <button
                    key={type} onClick={() => updateField('assetType', type as any)}
                    className={cn(
                      "p-6 rounded-[24px] border-2 text-left transition-all relative overflow-hidden",
                      formData.assetType === type
                        ? "border-slate-900 bg-slate-900 text-white shadow-xl"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-2xl mb-3 block">{type === 'STATIC' ? '🏷️' : '⚖️'}</span>
                    <span className="block font-bold text-sm tracking-tight mb-1">{type === 'STATIC' ? 'Fixed Price' : 'Dutch Auction'}</span>
                    <span className={cn("text-[10px] uppercase font-bold tracking-tighter opacity-60")}>
                      {type === 'STATIC' ? 'Immediate Listing' : 'Competitive Bidding'}
                    </span>
                    {formData.assetType === type && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle className="w-5 h-5 text-white/30" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <MinimalInput label="Total Supply" id="totalSupply" type="number" value={formData.totalSupply} onChange={(v: any) => updateField('totalSupply', v)} placeholder="e.g. 10000" />
                <MinimalInput label="Min Investment" id="minInvestment" type="number" value={formData.minInvestment} onChange={(v: any) => updateField('minInvestment', v)} placeholder="e.g. 100" />
              </div>
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Fundraising Limits (%)</h4>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <MinimalInput 
                  label="Floor %" 
                  id="minRaise" 
                  type="number" 
                  value={formData.minRaisePercentage} 
                  onChange={(v: any) => {
                    const numValue = Math.min(95, Math.max(0, parseInt(v) || 0));
                    updateField('minRaisePercentage', numValue.toString());
                  }}
                  placeholder="Min 0"
                  max="95"
                  min="0"
                  />
                  <MinimalInput 
                  label="Cap %" 
                  id="maxRaise" 
                  type="number" 
                  value={formData.maxRaisePercentage} 
                  onChange={(v: any) => {
                    const numValue = Math.min(95, Math.max(0, parseInt(v) || 0));
                    updateField('maxRaisePercentage', numValue.toString());
                  }}
                  max="95"
                  min="0"
                  placeholder="Max 95" 
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Duration Settings</h4>
                  <Clock className="w-4 h-4 text-slate-300" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {['Days', 'Hours', 'Minutes', 'Seconds'].map((unit) => {
                    const field = `auction${unit}` as any;
                    return (
                      <div key={unit} className="space-y-2">
                        <Label className="text-[10px] font-bold text-black uppercase tracking-tighter text-center block">{unit}</Label>
                        <Input
                          type="number" value={formData[field as keyof FormData] as string}
                          onChange={(e) => updateDurationField(field, e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl text-center font-bold font-geist text-slate-900 h-12 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 transition-all"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-2">Total Estimated Runtime</p>
                <p className="text-4xl font-bold text-slate-900 font-geist">
                  {formData.auctionDays}d {formData.auctionHours}h {formData.auctionMinutes}m
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold font-geist text-center border border-rose-100">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-white border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handlePrevious} disabled={currentStep === 1}
            className="text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <button
            onClick={currentStep === totalSteps ? handleSubmit : handleNext}
            disabled={isSubmitting}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 hover:shadow-xl active:scale-95 transition-all flex items-center gap-3 shadow-lg shadow-slate-200"
          >
            {isSubmitting ? "Uploading..." : currentStep === totalSteps ? "Launch Asset" : "Continue"}
            {currentStep !== totalSteps && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

const MinimalInput = ({ label, id, onChange, ...props }: any) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-black font-bold text-xs uppercase tracking-widest ml-1">{label}</Label>
    <Input
      id={id}
      onChange={(e) => onChange(e.target.value)}
      {...props}
      className="bg-slate-50 border-none rounded-2xl px-4 py-6 font-geist text-sm text-slate-900 transition-all focus:ring-2 focus:ring-slate-900/5 focus:bg-white outline-none placeholder:text-slate-400 hover:bg-slate-100"
    />
  </div>
);
