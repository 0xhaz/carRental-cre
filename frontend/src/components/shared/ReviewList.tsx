"use client";

import { useState } from "react";
import { Review, User } from "@/types";
import { Card, CardContent, Heading, Paragraph, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

export interface ReviewListProps {
  reviews: Review[];
  users?: User[]; // Optional user data to display names
  className?: string;
  showVehicleInfo?: boolean;
}

export function ReviewList({ reviews, users = [], className = "" }: ReviewListProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  const toggleExpanded = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const getUserName = (userId: string): string => {
    const user = users.find((u) => u._id === userId);
    return user?.name || "Anonymous User";
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-lg">
            {star <= rating ? "⭐" : "☆"}
          </span>
        ))}
      </div>
    );
  };

  if (reviews.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">No reviews yet. Be the first to leave a review!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {reviews.map((review) => {
        const isExpanded = expandedReviews.has(review._id);
        const commentLength = review.comment.length;
        const shouldTruncate = commentLength > 200;

        return (
          <Card key={review._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dull rounded-full flex items-center justify-center text-white font-semibold">
                      {getUserName(review.renter).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{getUserName(review.renter)}</p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>

                {review.wouldRecommend && (
                  <Badge variant="success" className="ml-2">
                    Recommended
                  </Badge>
                )}
              </div>

              {/* Detailed Ratings */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Vehicle Condition</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-sm">
                        {star <= (review.vehicleCondition || review.rating) ? "⭐" : "☆"}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Cleanliness</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-sm">
                        {star <= (review.cleanliness || review.rating) ? "⭐" : "☆"}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Communication</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-sm">
                        {star <= (review.communication || review.rating) ? "⭐" : "☆"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">
                  {shouldTruncate && !isExpanded
                    ? `${review.comment.slice(0, 200)}...`
                    : review.comment}
                </p>
                {shouldTruncate && (
                  <button
                    onClick={() => toggleExpanded(review._id)}
                    className="text-primary text-sm font-medium mt-2 hover:underline"
                  >
                    {isExpanded ? "Show less" : "Read more"}
                  </button>
                )}
              </div>

              {/* Owner Response */}
              {review.response && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-primary rounded">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      O
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 mb-1">Owner's Response</p>
                      <p className="text-sm text-gray-700">{review.response}</p>
                      {review.responseDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(review.responseDate), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Review Statistics Card
 */
export interface ReviewStatsProps {
  reviews: Review[];
  className?: string;
}

export function ReviewStats({ reviews, className = "" }: ReviewStatsProps) {
  if (reviews.length === 0) {
    return null;
  }

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  const recommendCount = reviews.filter((r) => r.wouldRecommend).length;
  const recommendPercentage = Math.round((recommendCount / totalReviews) * 100);

  // Rating distribution
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((review) => {
    const rating = review.rating as keyof typeof distribution;
    distribution[rating]++;
  });

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <Heading as="h3" className="mb-4">
          Rating Summary
        </Heading>

        {/* Overall Rating */}
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl font-bold text-primary">{averageRating.toFixed(1)}</div>
          <div className="flex-1">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-2xl">
                  {star <= Math.round(averageRating) ? "⭐" : "☆"}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-600">Based on {totalReviews} reviews</p>
            <p className="text-sm text-green-600 font-medium">
              {recommendPercentage}% would recommend
            </p>
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating as keyof typeof distribution];
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-8">{rating}★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
