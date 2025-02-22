CREATE TABLE `viewed_topics` (
  `id` bigint UNSIGNED NOT NULL,
  `id_topic` bigint UNSIGNED NOT NULL,
  `id_user` int NOT NULL,
  `id_category` int NOT NULL,
  `posts_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


ALTER TABLE `viewed_topics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_viewed_topic_topic` (`id_topic`),
  ADD KEY `fk_viewed_topic_user` (`id_user`),
  ADD KEY `fk_viewed_topic_category` (`id_category`);


ALTER TABLE `viewed_topics`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=133;


ALTER TABLE `viewed_topics`
  ADD CONSTRAINT `fk_viewed_topic_category` FOREIGN KEY (`id_category`) REFERENCES `forum_categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_viewed_topic_topic` FOREIGN KEY (`id_topic`) REFERENCES `topics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_viewed_topic_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;