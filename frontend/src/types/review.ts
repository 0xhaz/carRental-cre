/**
 * Review types for the rating and review system
 */

export interface Review {
  _id: string;
  booking: string; // Booking ID
  vehicle: string; // Vehicle ID
  renter: string; // User ID who rented
  rentor: string; // User ID who owns the vehicle
  rating: number; // 1-5 stars
  comment: string;
  response?: string; // Optional response from rentor
  responseDate?: Date;
  vehicleCondition?: number; // 1-5 rating
  cleanliness?: number; // 1-5 rating
  communication?: number; // 1-5 rating
  wouldRecommend: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
  vehicleCondition: number;
  cleanliness: number;
  communication: number;
  wouldRecommend: boolean;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
