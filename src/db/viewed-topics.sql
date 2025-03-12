CREATE TABLE viewed_topics (
    id bigint PRIMARY KEY AUTO_INCREMENT,
    id_topic bigint NOT NULL,
    id_user int NOT NULL,
    id_category int NOT NULL,
    posts_count int DEFAULT 0,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_category) REFERENCES forum_categories (id) ON DELETE CASCADE,
    FOREIGN KEY (id_topic) REFERENCES topics (id) ON DELETE CASCADE,
    FOREIGN KEY (id_user) REFERENCES users (id) ON DELETE CASCADE
)


CREATE TABLE posts (
    id bigint PRIMARY KEY AUTO_INCREMENT,
    message text  NOT NULL,
    id_author int NOT NULL,
    id_post_reply int NOT NULL,
    id_topic bigint UNSIGNED NOT NULL,
    is_deleted tinyint(1) NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    subject text NULL DEFAULT NULL,
    first tinyint(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (id_topic) REFERENCES topics (id) ON DELETE CASCADE,
    FOREIGN KEY (id_author) REFERENCES users (id) ON DELETE CASCADE
)