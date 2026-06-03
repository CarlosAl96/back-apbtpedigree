ALTER TABLE chat
ADD COLUMN chat_type VARCHAR(20) NOT NULL DEFAULT 'private';

UPDATE chat
SET chat_type = 'private'
WHERE chat_type IS NULL OR chat_type = '';

CREATE INDEX idx_chat_type_users ON chat (chat_type, id_user_one, id_user_two);
