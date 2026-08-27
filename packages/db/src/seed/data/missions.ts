export const checkoutMission = {
  title: 'Checkout Conversion Drop — Investigate & Fix',
  slug: 'checkout-conversion-drop',
  difficulty: 'mid' as const,
  estimatedMinutes: 60,
  company: {
    name: 'TechFlow',
    industry: 'E-commerce SaaS',
    size: 'scaleup' as const,
    description: 'TechFlow builds checkout infrastructure for mid-market e-commerce brands.',
  },
  managerName: 'Sarah Chen',
  managerTitle: 'Engineering Manager',
  department: 'Checkout Platform',
  sprint: 'Sprint 42',
  businessContext: `TechFlow's checkout widget is embedded by 200+ merchants. Yesterday evening at 18:47 UTC, our monitoring detected a 23% drop in checkout conversion across all TechFlow-powered stores. Initial investigation by on-call suggests it may be related to the frontend release deployed at 17:30 UTC (PR #891 — "Checkout V2 redesign").`,
  problemStatement: `Your task is to investigate the checkout component, identify the regression introduced in the latest release, fix it, and verify the fix works correctly on both desktop and mobile viewports. You are also expected to write a short engineering note explaining what you found, what you changed, and how you verified the fix.`,
  requirements: [
    {
      id: 'req-1',
      description: 'Identify the specific bug in the checkout component that caused the conversion drop',
      isRequired: true,
      weight: 30,
    },
    {
      id: 'req-2',
      description: 'Fix the bug without introducing new regressions',
      isRequired: true,
      weight: 40,
    },
    {
      id: 'req-3',
      description: 'Verify the fix works correctly (tests pass)',
      isRequired: true,
      weight: 20,
    },
    {
      id: 'req-4',
      description: 'Write a clear engineering note explaining the investigation and fix',
      isRequired: false,
      weight: 10,
    },
  ],
  acceptanceCriteria: [
    'All 6 existing checkout tests pass',
    'The checkout form submits successfully with valid input',
    'Form validation correctly rejects invalid inputs',
    'The "Place Order" button is not disabled when all required fields are filled',
    'Engineering note explains the root cause and the fix',
  ],
  evaluationCriteria: [
    {
      id: 'ec-1',
      name: 'Bug Identification',
      description: 'Correctly identifies the root cause of the checkout failure',
      weight: 25,
      evaluationType: 'deterministic' as const,
    },
    {
      id: 'ec-2',
      name: 'Fix Correctness',
      description: 'All test cases pass after the fix',
      weight: 45,
      evaluationType: 'deterministic' as const,
    },
    {
      id: 'ec-3',
      name: 'Code Quality',
      description: 'Fix is clean, minimal, and does not introduce unnecessary changes',
      weight: 15,
      evaluationType: 'ai_assisted' as const,
    },
    {
      id: 'ec-4',
      name: 'Engineering Note',
      description: 'Clear explanation of root cause, fix, and verification',
      weight: 15,
      evaluationType: 'ai_assisted' as const,
    },
  ],
  availableTools: ['Monaco Editor', 'Terminal', 'Console', 'Test Runner'],
  expectedDeliverable: 'Fixed checkout component code + engineering note explaining the investigation and resolution',
  referenceDocumentation: `## TechFlow Checkout Component\n\nThe checkout form at \`src/components/CheckoutForm.tsx\` handles the final step of the purchase flow.\n\n### Expected behavior\n- Form validates: name, email, card number (16 digits), expiry (MM/YY), CVV (3 digits)\n- Submit button is enabled only when all fields are valid\n- On submit: calls \`onSubmit(formData)\` callback\n- Displays validation errors inline\n\n### Recent changes (PR #891)\nPR #891 refactored the form validation logic to use a new \`useFormValidation\` hook.\n\n### Bug report from on-call\n"Users are reporting they can't click Place Order even after filling all fields correctly. The button stays disabled."`,

  // Starter files for the workspace
  starterFiles: {
    'src/components/CheckoutForm.tsx': `import React, { useState } from 'react';
import { useFormValidation } from '../hooks/useFormValidation';

interface CheckoutFormData {
  fullName: string;
  email: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => void;
  isLoading?: boolean;
}

export function CheckoutForm({ onSubmit, isLoading = false }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    email: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const { errors, isValid } = useFormValidation(formData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form" data-testid="checkout-form">
      <div className="form-group">
        <label htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="John Smith"
          data-testid="input-full-name"
        />
        {errors.fullName && <span className="error" data-testid="error-full-name">{errors.fullName}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          data-testid="input-email"
        />
        {errors.email && <span className="error" data-testid="error-email">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="cardNumber">Card Number</label>
        <input
          id="cardNumber"
          name="cardNumber"
          type="text"
          value={formData.cardNumber}
          onChange={handleChange}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          data-testid="input-card-number"
        />
        {errors.cardNumber && <span className="error" data-testid="error-card-number">{errors.cardNumber}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="expiry">Expiry (MM/YY)</label>
          <input
            id="expiry"
            name="expiry"
            type="text"
            value={formData.expiry}
            onChange={handleChange}
            placeholder="12/25"
            maxLength={5}
            data-testid="input-expiry"
          />
          {errors.expiry && <span className="error" data-testid="error-expiry">{errors.expiry}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="cvv">CVV</label>
          <input
            id="cvv"
            name="cvv"
            type="text"
            value={formData.cvv}
            onChange={handleChange}
            placeholder="123"
            maxLength={3}
            data-testid="input-cvv"
          />
          {errors.cvv && <span className="error" data-testid="error-cvv">{errors.cvv}</span>}
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="submit-button"
        data-testid="btn-place-order"
      >
        {isLoading ? 'Processing...' : 'Place Order'}
      </button>
    </form>
  );
}
`,
    'src/hooks/useFormValidation.ts': `import { useMemo } from 'react';

interface FormData {
  fullName: string;
  email: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
}

interface ValidationResult {
  errors: ValidationErrors;
  isValid: boolean;
}

export function useFormValidation(formData: FormData): ValidationResult {
  const errors: ValidationErrors = {};

  if (!formData.fullName || formData.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  }

  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!formData.email || !emailRegex.test(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // BUG: This regex is wrong — it requires a hyphen separator but the form placeholder shows spaces
  // Original: /^\\d{16}$/ was replaced with /^\\d{4}-\\d{4}-\\d{4}-\\d{4}$/ in PR #891
  const cardRegex = /^\\d{4}-\\d{4}-\\d{4}-\\d{4}$/;
  const cardDigits = formData.cardNumber.replace(/\\s/g, '');
  if (!formData.cardNumber || !cardRegex.test(formData.cardNumber)) {
    errors.cardNumber = 'Please enter a valid 16-digit card number';
  }

  const expiryRegex = /^(0[1-9]|1[0-2])\\/\\d{2}$/;
  if (!formData.expiry || !expiryRegex.test(formData.expiry)) {
    errors.expiry = 'Please enter a valid expiry date (MM/YY)';
  }

  const cvvRegex = /^\\d{3}$/;
  if (!formData.cvv || !cvvRegex.test(formData.cvv)) {
    errors.cvv = 'CVV must be 3 digits';
  }

  // BUG: isValid is computed incorrectly — Object.keys(errors).length > 0 means there ARE errors
  // This was accidentally inverted in PR #891
  const isValid = Object.keys(errors).length > 0;

  return { errors, isValid };
}
`,
    'src/hooks/useFormValidation.test.ts': `import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormValidation } from './useFormValidation';

const validFormData = {
  fullName: 'John Smith',
  email: 'john@example.com',
  cardNumber: '1234 5678 9012 3456',
  expiry: '12/25',
  cvv: '123',
};

describe('useFormValidation', () => {
  it('should return isValid=true for valid form data', () => {
    const { result } = renderHook(() => useFormValidation(validFormData));
    expect(result.current.isValid).toBe(true);
    expect(Object.keys(result.current.errors)).toHaveLength(0);
  });

  it('should return error for short name', () => {
    const { result } = renderHook(() =>
      useFormValidation({ ...validFormData, fullName: 'A' })
    );
    expect(result.current.errors.fullName).toBeDefined();
    expect(result.current.isValid).toBe(false);
  });

  it('should return error for invalid email', () => {
    const { result } = renderHook(() =>
      useFormValidation({ ...validFormData, email: 'not-an-email' })
    );
    expect(result.current.errors.email).toBeDefined();
    expect(result.current.isValid).toBe(false);
  });

  it('should accept card number with spaces (1234 5678 9012 3456)', () => {
    const { result } = renderHook(() =>
      useFormValidation({ ...validFormData, cardNumber: '1234 5678 9012 3456' })
    );
    expect(result.current.errors.cardNumber).toBeUndefined();
  });

  it('should reject card number with wrong format', () => {
    const { result } = renderHook(() =>
      useFormValidation({ ...validFormData, cardNumber: 'abcd' })
    );
    expect(result.current.errors.cardNumber).toBeDefined();
    expect(result.current.isValid).toBe(false);
  });

  it('should return error for invalid CVV', () => {
    const { result } = renderHook(() =>
      useFormValidation({ ...validFormData, cvv: '12' })
    );
    expect(result.current.errors.cvv).toBeDefined();
    expect(result.current.isValid).toBe(false);
  });
});
`,
    'ENGINEERING_NOTE.md': `# Engineering Investigation Note\n\n**Mission:** Checkout Conversion Drop — Sprint 42\n**Engineer:** [Your name]\n**Date:** ${new Date().toISOString().split('T')[0]}\n\n## What I Found\n\n[Describe the bugs you identified in the checkout code]\n\n## Root Cause\n\n[Explain why these bugs caused checkout conversion to drop]\n\n## What I Changed\n\n[Describe exactly what you changed and why]\n\n## How I Verified the Fix\n\n[Describe how you confirmed the fix works — test results, manual testing]\n\n## Impact Assessment\n\n[Describe what the expected improvement in conversion should be]\n`,
  },
  // Test cases for deterministic evaluation
  testCases: [
    {
      id: 'tc-1',
      name: 'Valid form data returns isValid=true',
      input: JSON.stringify({ fullName: 'John Smith', email: 'john@example.com', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '123' }),
      expectedOutput: '{"isValid":true,"errorCount":0}',
      isHidden: false,
      weight: 20,
    },
    {
      id: 'tc-2',
      name: 'Invalid email returns isValid=false',
      input: JSON.stringify({ fullName: 'John Smith', email: 'bad-email', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '123' }),
      expectedOutput: '{"isValid":false,"hasEmailError":true}',
      isHidden: false,
      weight: 15,
    },
    {
      id: 'tc-3',
      name: 'Short name returns isValid=false',
      input: JSON.stringify({ fullName: 'A', email: 'john@example.com', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '123' }),
      expectedOutput: '{"isValid":false,"hasNameError":true}',
      isHidden: false,
      weight: 15,
    },
    {
      id: 'tc-4',
      name: 'Space-separated card number is valid',
      input: JSON.stringify({ fullName: 'John Smith', email: 'john@example.com', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '123' }),
      expectedOutput: '{"isValid":true,"hasCardError":false}',
      isHidden: false,
      weight: 20,
    },
    {
      id: 'tc-5',
      name: 'Invalid CVV returns isValid=false',
      input: JSON.stringify({ fullName: 'John Smith', email: 'john@example.com', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '12' }),
      expectedOutput: '{"isValid":false,"hasCvvError":true}',
      isHidden: false,
      weight: 15,
    },
    {
      id: 'tc-6',
      name: 'Empty form has all errors',
      input: JSON.stringify({ fullName: '', email: '', cardNumber: '', expiry: '', cvv: '' }),
      expectedOutput: '{"isValid":false,"errorCount":5}',
      isHidden: true,
      weight: 15,
    },
  ],
  skillSlugs: ['debugging', 'javascript', 'react', 'typescript', 'testing', 'technical-communication'],
};
