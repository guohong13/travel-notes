CREATE DATABASE IF NOT EXISTS `travel-notes`;
-- 使用 travel-notes 数据库
USE `travel-notes`;

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(255),
    `avatar_url` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 
-- 创建游记表
CREATE TABLE IF NOT EXISTS `travel_notes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `video_url` TEXT,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `reject_reason` TEXT,
    `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);    
-- 创建游记图片表
CREATE TABLE IF NOT EXISTS `note_images` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `travel_notes_id` INT NOT NULL,
    `image_url` TEXT NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (`travel_notes_id`) REFERENCES `travel_notes`(`id`)
);   
-- 创建管理员表
CREATE TABLE IF NOT EXISTS `admins` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'reviewer') NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);    
