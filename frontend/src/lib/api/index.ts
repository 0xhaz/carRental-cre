// Central export file for all API services
export { authApi } from "./authApi";
export type { LoginCredentials, RegisterData } from "./authApi";
export { vehicleApi } from "./vehicleApi";
export { bookingApi } from "./bookingApi";
export { renterApi } from "./renterApi";
export { rentorApi } from "./rentorApi";
export type { RentorDashboardData } from "./rentorApi";
export { reviewApi } from "./reviewApi";
export { notificationApi } from "./notificationApi";
export { investmentApi } from "./investmentApi";
export { kycApi } from "./kycApi";
export type { UpgradeRequest, KYCStatus, KYCSubmission } from "./kycApi";
export { default as apiClient } from "./axios";
