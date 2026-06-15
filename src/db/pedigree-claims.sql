CREATE TABLE IF NOT EXISTS pedigree_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pedigree_id INT NOT NULL,
  status ENUM('pending', 'approved', 'denied') NOT NULL DEFAULT 'pending',
  message TEXT NULL,
  admin_note TEXT NULL,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pedigree_claims_user_id (user_id),
  INDEX idx_pedigree_claims_pedigree_id (pedigree_id),
  INDEX idx_pedigree_claims_status (status),
  CONSTRAINT fk_pedigree_claims_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_pedigree_claims_pedigree_id FOREIGN KEY (pedigree_id) REFERENCES dogsBackUp2(id),
  CONSTRAINT fk_pedigree_claims_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);
