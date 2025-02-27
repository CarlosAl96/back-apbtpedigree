CREATE TABLE dogs_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    dog_id INT NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_dog FOREIGN KEY (dog_id) REFERENCES dogsbackup2(id) ON DELETE CASCADE
);



-- CREATE TABLE sellers (
--     id SERIAL PRIMARY KEY,
--     identification VARCHAR(20) UNIQUE NOT NULL,
--     first_name VARCHAR(50) NOT NULL,
--     last_name VARCHAR(50) NOT NULL,
--     email VARCHAR(100) UNIQUE NOT NULL,
--     username VARCHAR(50) UNIQUE NOT NULL,
--     phone VARCHAR(50),
--     address VARCHAR(255),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE seller_user_contracts (
--     id SERIAL PRIMARY KEY,
--     seller_id INT REFERENCES sellers(id) ON DELETE CASCADE,
--     user_id INT REFERENCES users(id) ON DELETE CASCADE,
--     contract_id INT REFERENCES contracts(id) ON DELETE CASCADE,
--     amount_to_pay DECIMAL(10, 2) NOT NULL,
--     is_paid BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );