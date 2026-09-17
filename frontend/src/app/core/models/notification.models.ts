export interface Notification {
  id: string;
  recipientEmail: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationRequest {
  recipientEmail: string;
  message: string;
}
