ALTER TABLE message
ADD COLUMN audio longtext NULL DEFAULT NULL;

ALTER TABLE stream_chat_messages
ADD COLUMN img longtext NULL DEFAULT NULL,
ADD COLUMN audio longtext NULL DEFAULT NULL;
