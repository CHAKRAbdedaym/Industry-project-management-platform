CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_email ON notifications (recipient_email);
