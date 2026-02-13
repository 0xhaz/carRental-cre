"use client";

import { useState } from "react";
import { Input, Card, CardContent } from "@/components/ui";

export interface RenterDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  driverLicense: {
    number: string;
    expiryDate: string;
    issuingState: string;
    frontImage?: File;
    backImage?: File;
  };
}

export interface RenterDetailsFormProps {
  initialData?: Partial<RenterDetails>;
  onChange: (details: RenterDetails) => void;
}

export function RenterDetailsForm({ initialData, onChange }: RenterDetailsFormProps) {
  const [details, setDetails] = useState<RenterDetails>({
    fullName: initialData?.fullName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zipCode: initialData?.zipCode || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    driverLicense: {
      number: initialData?.driverLicense?.number || "",
      expiryDate: initialData?.driverLicense?.expiryDate || "",
      issuingState: initialData?.driverLicense?.issuingState || "",
      frontImage: initialData?.driverLicense?.frontImage,
      backImage: initialData?.driverLicense?.backImage,
    },
  });

  const handleChange = (field: keyof RenterDetails, value: any) => {
    const updated = { ...details, [field]: value };
    setDetails(updated);
    onChange(updated);
  };

  const handleLicenseChange = (field: keyof RenterDetails["driverLicense"], value: any) => {
    const updated = {
      ...details,
      driverLicense: { ...details.driverLicense, [field]: value },
    };
    setDetails(updated);
    onChange(updated);
  };

  const handleFileChange = (field: "frontImage" | "backImage", file: File | undefined) => {
    const updated = {
      ...details,
      driverLicense: { ...details.driverLicense, [field]: file },
    };
    setDetails(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Personal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name *</label>
              <Input
                type="text"
                value={details.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <Input
                type="email"
                value={details.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone Number *</label>
              <Input
                type="tel"
                value={details.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth *</label>
              <Input
                type="date"
                value={details.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Address</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Street Address *</label>
              <Input
                type="text"
                value={details.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City *</label>
                <Input
                  type="text"
                  value={details.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="New York"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">State *</label>
                <Input
                  type="text"
                  value={details.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="NY"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                <Input
                  type="text"
                  value={details.zipCode}
                  onChange={(e) => handleChange("zipCode", e.target.value)}
                  placeholder="10001"
                  required
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Driver's License */}
      <Card>
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Driver's License Information</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">License Number *</label>
              <Input
                type="text"
                value={details.driverLicense.number}
                onChange={(e) => handleLicenseChange("number", e.target.value)}
                placeholder="D1234567"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Expiry Date *</label>
              <Input
                type="date"
                value={details.driverLicense.expiryDate}
                onChange={(e) => handleLicenseChange("expiryDate", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Issuing State *</label>
              <Input
                type="text"
                value={details.driverLicense.issuingState}
                onChange={(e) => handleLicenseChange("issuingState", e.target.value)}
                placeholder="CA"
                required
              />
            </div>
          </div>

          {/* License Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">License Front *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("frontImage", e.target.files?.[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {details.driverLicense.frontImage && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {details.driverLicense.frontImage.name}
                </p>
              )}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">License Back *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("backImage", e.target.files?.[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {details.driverLicense.backImage && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {details.driverLicense.backImage.name}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>📸 Photo Tips:</strong> Ensure your license is clearly visible, all text is readable,
              and there's no glare. Photos will be verified before booking approval.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          * Required fields. Your information is encrypted and stored securely in compliance with data
          protection regulations.
        </p>
      </div>
    </div>
  );
}
