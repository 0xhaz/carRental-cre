"use client";

import { useState } from "react";
import { Button, Card, CardContent, Heading, Paragraph } from "@/components/ui";
import { ReviewFormData } from "@/types";
import { X } from "lucide-react";
import toast from "react-hot-toast";

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReviewFormData) => void;
  vehicleName: string;
}

export function ReviewModal({ isOpen, onClose, onSubmit, vehicleName }: ReviewModalProps) {
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 5,
    comment: "",
    vehicleCondition: 5,
    cleanliness: 5,
    communication: 5,
    wouldRecommend: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.comment.trim()) {
      toast.error("Please add a comment to your review");
      return;
    }

    if (formData.comment.trim().length < 10) {
      toast.error("Comment must be at least 10 characters");
      return;
    }

    onSubmit(formData);
    toast.success("Review submitted successfully!");
    onClose();

    // Reset form
    setFormData({
      rating: 5,
      comment: "",
      vehicleCondition: 5,
      cleanliness: 5,
      communication: 5,
      wouldRecommend: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <Heading as="h2" className="mb-1">
                Write a Review
              </Heading>
              <Paragraph className="text-sm text-gray-600">
                Share your experience with {vehicleName}
              </Paragraph>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Overall Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="text-3xl transition-all hover:scale-110"
                  >
                    {star <= formData.rating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Condition
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, vehicleCondition: star })}
                    className="text-2xl transition-all hover:scale-110"
                  >
                    {star <= formData.vehicleCondition ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            {/* Cleanliness */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cleanliness
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, cleanliness: star })}
                    className="text-2xl transition-all hover:scale-110"
                  >
                    {star <= formData.cleanliness ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            {/* Communication */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Communication
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, communication: star })}
                    className="text-2xl transition-all hover:scale-110"
                  >
                    {star <= formData.communication ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review *
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={5}
                placeholder="Share details about your rental experience..."
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum 10 characters ({formData.comment.length}/10)
              </p>
            </div>

            {/* Would Recommend */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="wouldRecommend"
                checked={formData.wouldRecommend}
                onChange={(e) => setFormData({ ...formData, wouldRecommend: e.target.checked })}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="wouldRecommend" className="text-sm font-medium text-gray-700">
                I would recommend this vehicle to others
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Submit Review
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
