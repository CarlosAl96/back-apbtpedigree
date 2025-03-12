CREATE TABLE streams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proposed_start_date DATETIME NOT NULL,
    actual_start_date DATETIME,
    proposed_end_date DATETIME NOT NULL,
    actual_end_date DATETIME,
    user_count INT DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    chat_message_count INT DEFAULT 0,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    is_live BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stream_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
);

CREATE TABLE stream_chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



CREATE TABLE chat (
    id bigint PRIMARY KEY AUTO_INCREMENT,
    id_user_one int NOT NULL,
    id_user_two int NOT NULL,
    viewed_one tinyint(1) DEFAULT 0,
    viewed_two tinyint(1) DEFAULT 0,
    is_deleted_one tinyint(1) DEFAULT 0,
    is_deleted_two tinyint(1) DEFAULT 0,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user_one) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (id_user_two) REFERENCES users(id) ON DELETE CASCADE
)


CREATE TABLE forum_categories (
    id int PRIMARY KEY AUTO_INCREMENT,
    name text NOT NULL,
    description text DEFAULT NULL,
    moderators text DEFAULT NULL,
    topics int DEFAULT 0,
    posts int DEFAULT 0,
    last_post text DEFAULT NULL,
    is_locked tinyint(1) NOT NULL DEFAULT 0
)

CREATE TABLE message (
    id bigint PRIMARY KEY AUTO_INCREMENT,
    id_chat bigint NOT NULL,
    id_sender int NOT NULL,
    id_receiver int NOT NULL,
    message text  NOT NULL,
    is_read tinyint(1) DEFAULT 0,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    img longtext NULL DEFAULT NULL,
    FOREIGN KEY (id_chat) REFERENCES chat(id) ON DELETE CASCADE,
    FOREIGN KEY (id_sender) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (id_receiver) REFERENCES users(id) ON DELETE CASCADE
)


CREATE TABLE topics (
    id bigint PRIMARY KEY AUTO_INCREMENT,
    name text NOT NULL,
    replies int NOT NULL DEFAULT 0,
    author text NOT NULL,
    views int NOT NULL DEFAULT 0,
    last_post text DEFAULT NULL,
    id_categories int NOT NULL,
    sticky tinyint(1) NOT NULL DEFAULT 0,
    message text NOT NULL,
    id_author int NOT NULL,
    is_locked tinyint(1) NOT NULL DEFAULT 0,
    is_deleted tinyint(1) NOT NULL DEFAULT 0,
    is_announcement tinyint(1) NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categories) REFERENCES forum_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (id_author) REFERENCES users(id) ON DELETE CASCADE,
)