CREATE USER auth_service WITH PASSWORD 'auth_service';
CREATE DATABASE auth_service OWNER auth_service;

CREATE USER project_service WITH PASSWORD 'project_service';
CREATE DATABASE project_service OWNER project_service;

CREATE USER task_service WITH PASSWORD 'task_service';
CREATE DATABASE task_service OWNER task_service;

CREATE USER notification_service WITH PASSWORD 'notification_service';
CREATE DATABASE notification_service OWNER notification_service;
