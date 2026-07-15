DROP PROCEDURE IF EXISTS add_index_if_not_exists;

DELIMITER $$

CREATE PROCEDURE add_index_if_not_exists(
  IN table_name_value VARCHAR(128),
  IN index_name_value VARCHAR(128),
  IN create_statement_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND INDEX_NAME = index_name_value
  ) THEN
    SET @create_index_sql = create_statement_value;
    PREPARE create_index_stmt FROM @create_index_sql;
    EXECUTE create_index_stmt;
    DEALLOCATE PREPARE create_index_stmt;
  END IF;
END$$

DELIMITER ;

CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_father_id', 'CREATE INDEX idx_dogs_father_id ON dogsBackUp2 (father_id)');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_mother_id', 'CREATE INDEX idx_dogs_mother_id ON dogsBackUp2 (mother_id)');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_user_id', 'CREATE INDEX idx_dogs_user_id ON dogsBackUp2 (user_id)');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_entered_by', 'CREATE INDEX idx_dogs_entered_by ON dogsBackUp2 (entered_by)');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_private_updated', 'CREATE INDEX idx_dogs_private_updated ON dogsBackUp2 (private, updated_at, created_at, id)');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_created_id', 'CREATE INDEX idx_dogs_created_id ON dogsBackUp2 (created_at, id)');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_name', 'CREATE INDEX idx_dogs_name ON dogsBackUp2 (name(191))');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_owner', 'CREATE INDEX idx_dogs_owner ON dogsBackUp2 (owner(191))');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_breeder', 'CREATE INDEX idx_dogs_breeder ON dogsBackUp2 (breeder(191))');
CALL add_index_if_not_exists('dogsBackUp2', 'idx_dogs_callname', 'CREATE INDEX idx_dogs_callname ON dogsBackUp2 (callname(191))');

CALL add_index_if_not_exists('message', 'idx_message_chat_id', 'CREATE INDEX idx_message_chat_id ON message (id_chat, id)');
CALL add_index_if_not_exists('chat', 'idx_chat_user_one_type', 'CREATE INDEX idx_chat_user_one_type ON chat (id_user_one, chat_type)');
CALL add_index_if_not_exists('chat', 'idx_chat_user_two_type', 'CREATE INDEX idx_chat_user_two_type ON chat (id_user_two, chat_type)');

CALL add_index_if_not_exists('topics', 'idx_topics_category_deleted_updated', 'CREATE INDEX idx_topics_category_deleted_updated ON topics (id_categories, is_deleted, sticky, is_announcement, updated_at)');
CALL add_index_if_not_exists('posts', 'idx_posts_topic_deleted_created', 'CREATE INDEX idx_posts_topic_deleted_created ON posts (id_topic, is_deleted, first, created_at)');
CALL add_index_if_not_exists('viewed_topics', 'idx_viewed_topics_user_topic', 'CREATE INDEX idx_viewed_topics_user_topic ON viewed_topics (id_user, id_topic)');
CALL add_index_if_not_exists('viewed_topics', 'idx_viewed_topics_user_category', 'CREATE INDEX idx_viewed_topics_user_category ON viewed_topics (id_user, id_category)');

CALL add_index_if_not_exists('pedigree_claims', 'idx_claims_user_created', 'CREATE INDEX idx_claims_user_created ON pedigree_claims (user_id, created_at, id)');
CALL add_index_if_not_exists('pedigree_claims', 'idx_claims_pedigree_status', 'CREATE INDEX idx_claims_pedigree_status ON pedigree_claims (pedigree_id, status)');

DROP PROCEDURE IF EXISTS add_index_if_not_exists;
