// src/lib/api/kyc.service.ts

import type { KYCSubmitPayload, KYCSubmitResponse } from '../../types/auth.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ============================================================================
// MOCK MODE CONFIGURATION
// ============================================================================
// Set to true to use mock data (no backend required)
// Set to false when backend is ready
const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK_AUTH === 'true' || true;

/**
 * KYC Service - Handles KYC-related API calls
 * Separate from auth service as per requirements
 *
 * MOCK MODE: Currently using simulated backend responses for development
 *
 * TO SWITCH TO REAL BACKEND:
 * 1. Set USE_MOCK_MODE = false (or set VITE_USE_MOCK_AUTH=false in .env)
 * 2. Ensure backend is running at API_BASE_URL
 * 3. No other code changes needed - all endpoints are already configured
 */
class KYCService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Submit KYC completion with documents
   *
   * ENDPOINT: POST /kyc/submit
   *
   * AUTHENTICATION: Required
   * - Header: Authorization: Bearer {ACCESS_TOKEN}
   * - The access token is obtained from /auth/login endpoint
   *
   * REQUEST BODY:
   * {
   *   source: 'DIGILOCKER_SIMULATION' | 'DOCUMENT_UPLOAD',
   *   documents: {
   *     aadhaar: string,  // Document identifier or file path
   *     pan: string       // Document identifier or file path
   *   }
   * }
   *
   * BACKEND IMPLEMENTATION REQUIREMENTS:
   * 1. Verify JWT access token and extract userId
   * 2. Validate that user exists and is not already KYC verified
   * 3. Store document references in database
   * 4. Update user.kycStatus to 'PENDING' or 'APPROVED' based on your workflow
   * 5. If using actual document upload, integrate with file storage (S3, etc.)
   * 6. Return success status with updated user info
   *
   * EXPECTED BACKEND RESPONSE:
   * {
   *   success: boolean,
   *   message: string,
   *   user: {
   *     id: string,
   *     walletAddress: string,
   *     role: 'INVESTOR' | 'ISSUER' | 'ADMIN',
   *     kyc: boolean  // Updated to true after approval
   *   }
   * }
   *
   * BACKEND LOGIC FLOW:
   * 1. Authenticate user from Bearer token
   * 2. Parse and validate payload
   * 3. Store document metadata in kyc_documents table:
   *    - userId
   *    - documentType (AADHAAR, PAN)
   *    - documentIdentifier (from payload.documents)
   *    - source (DIGILOCKER_SIMULATION or DOCUMENT_UPLOAD)
   *    - submittedAt (timestamp)
   * 4. Update users table:
   *    - kycStatus = 'PENDING' or 'APPROVED'
   *    - kycSubmittedAt = now()
   * 5. (Optional) Trigger verification workflow or manual review
   * 6. Return success response
   *
   * FILE UPLOAD HANDLING (if implementing real file upload):
   * - Frontend should upload files to /kyc/upload-document endpoint first
   * - That endpoint returns file URLs or identifiers
   * - Then send those identifiers to /kyc/submit
   * - Alternative: Use multipart/form-data in this endpoint directly
   *
   * DATABASE SCHEMA SUGGESTION:
   *
   * users table:
   * - id (UUID, primary key)
   * - walletAddress (string, unique)
   * - role (enum: INVESTOR, ISSUER, ADMIN)
   * - kycStatus (enum: NOT_STARTED, PENDING, APPROVED, REJECTED)
   * - kycSubmittedAt (timestamp, nullable)
   * - kycApprovedAt (timestamp, nullable)
   *
   * kyc_documents table:
   * - id (UUID, primary key)
   * - userId (UUID, foreign key to users)
   * - documentType (enum: AADHAAR, PAN)
   * - documentIdentifier (string)
   * - source (enum: DIGILOCKER_SIMULATION, DOCUMENT_UPLOAD)
   * - submittedAt (timestamp)
   *
   * ERROR CASES:
   * - 401: Invalid or expired access token
   * - 400: Invalid payload or missing documents
   * - 409: KYC already submitted
   * - 500: Database error or file storage error
   *
   * SECURITY NOTES:
   * - Validate JWT signature and expiry
   * - Ensure documents belong to authenticated user
   * - Store sensitive documents securely (encrypt at rest)
   * - Implement rate limiting to prevent abuse
   */
  async submitKYC(payload: KYCSubmitPayload): Promise<KYCSubmitResponse> {
    // MOCK MODE: Simulate KYC submission
    if (USE_MOCK_MODE) {
      console.log('🔧 MOCK MODE: Simulating KYC submission');
      console.log('Payload:', payload);

      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        throw new Error('No access token found. Please login first.');
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock successful response
      const mockResponse: KYCSubmitResponse = {
        success: true,
        message: 'KYC submitted successfully. Verification in progress.',
      };

      return mockResponse;
    }

    // REAL MODE: Submit to backend
    try {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        throw new Error('No access token found. Please login first.');
      }

      const response = await fetch(`${this.baseURL}/kyc/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'KYC submission failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting KYC:', error);
      throw error;
    }
  }

  /**
   * OPTIONAL FUTURE ENDPOINT: Upload KYC Documents
   *
   * ENDPOINT: POST /kyc/upload-document
   *
   * REQUEST: multipart/form-data
   * - file: File (Aadhaar or PAN document)
   * - documentType: 'AADHAAR' | 'PAN'
   *
   * RESPONSE:
   * {
   *   documentId: string,      // Unique identifier for the uploaded file
   *   documentUrl: string,     // S3 URL or storage URL
   *   documentType: string
   * }
   *
   * BACKEND IMPLEMENTATION:
   * 1. Authenticate user from Bearer token
   * 2. Validate file type (PDF, JPG, PNG) and size (max 5MB)
   * 3. Generate unique filename: {userId}_{documentType}_{timestamp}.{ext}
   * 4. Upload to S3 or cloud storage
   * 5. Store metadata in database
   * 6. Return document identifier
   *
   * This endpoint would be called before submitKYC() to get document identifiers
   */

  /**
   * OPTIONAL FUTURE ENDPOINT: Get KYC Status
   *
   * ENDPOINT: GET /kyc/status
   *
   * AUTHENTICATION: Required (Bearer token)
   *
   * RESPONSE:
   * {
   *   status: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED',
   *   submittedAt: string | null,
   *   approvedAt: string | null,
   *   rejectionReason: string | null,
   *   documents: [
   *     {
   *       type: 'AADHAAR' | 'PAN',
   *       submittedAt: string,
   *       status: 'PENDING' | 'APPROVED' | 'REJECTED'
   *     }
   *   ]
   * }
   */
}

// Factory instance
export const kycService = new KYCService(API_BASE_URL);
