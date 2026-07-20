"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

type TapResponse = {
  org_name?: string;
  form_fields?: FormField[];
  default_branch?: string;
};

export default function TapPage() {
  const params = useParams();
  const token = params?.token as string | undefined;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TapResponse | null>(null);

  // form state
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [gdprConsent, setGdprConsent] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/tap/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("This card isn't recognized.");
          } else {
            setError("Unable to connect. Please try again later.");
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError("Unable to connect. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-stone-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-medium text-stone-900">Oops</h1>
          <p className="text-stone-500">{error || "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted (step 1 placeholder):", {
      ...formData,
      gdpr_consent: gdprConsent
    });
    alert("Form submitted! Check console. Actual submission is step 2.");
  };

  return (
    <div className="px-6 py-12 flex flex-col items-center">
      <div className="mb-8 text-center space-y-1">
        <h1 className="text-2xl font-semibold text-stone-900">
          {data.org_name || "Welcome"}
        </h1>
        <p className="text-stone-500 text-sm">Please fill out the form below to connect.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        {Array.isArray(data.form_fields) && data.form_fields.length > 0 ? (
          data.form_fields.map((field) => {
            const fieldType = ["text", "email", "tel", "dropdown"].includes(field.type) ? field.type : "text";

          return (
            <div key={field.name} className="flex flex-col space-y-1">
              <label htmlFor={field.name} className="text-sm font-medium text-stone-700">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </label>
              
              {fieldType === "dropdown" ? (
                <div className="relative">
                  <select
                    id={field.name}
                    name={field.name}
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="touch-target w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent appearance-none"
                  >
                    <option value="" disabled>Select an option</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <input
                  type={fieldType}
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="touch-target w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              )}
            </div>
          );
        })
        ) : (
          <div className="text-center py-4 text-stone-500">
            No form fields available.
          </div>
        )}

        <div className="pt-2 flex items-start space-x-3">
          <input
            type="checkbox"
            id="gdpr_consent"
            required
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-stone-300 text-gold focus:ring-gold accent-gold"
          />
          <label htmlFor="gdpr_consent" className="text-sm text-stone-600 leading-tight">
            I consent to the collection and processing of my personal data in accordance with the Privacy Policy.
          </label>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            className="touch-target w-full flex items-center justify-center rounded-md bg-gold hover:bg-gold-hover text-white font-medium transition-colors"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
