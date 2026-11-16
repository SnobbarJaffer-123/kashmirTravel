CREATE DATABASE IF NOT EXISTS kashmir_travel CHARACTER SET utf8mb4;
USE kashmir_travel;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  destination VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  duration_days TINYINT NOT NULL,
  price_inr INT NOT NULL COMMENT 'price per person in rupees',
  max_guests TINYINT NOT NULL DEFAULT 10,
  image_url VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_destination (destination),
  INDEX idx_price (price_inr)
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  travel_date DATE NOT NULL,
  guests TINYINT NOT NULL,
  total_inr INT NOT NULL,
  status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES packages(id),
  INDEX idx_user (user_id),
  INDEX idx_package_date (package_id, travel_date)
);

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES packages(id),
  UNIQUE KEY one_review_per_user (user_id, package_id)
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  provider VARCHAR(30) NOT NULL,
  provider_ref VARCHAR(80),
  amount_inr INT NOT NULL,
  status ENUM('created','paid','failed') NOT NULL DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
