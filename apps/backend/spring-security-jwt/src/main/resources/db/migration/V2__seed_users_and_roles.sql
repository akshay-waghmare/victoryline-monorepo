-- Seed users and roles (idempotent for H2 using MERGE; adjust for MySQL later)
MERGE INTO role KEY(id) VALUES (4, 'Admin role', 'ADMIN');
MERGE INTO role KEY(id) VALUES (5, 'User role', 'USER');
MERGE INTO user (id, username, password, salary, age, balance, exposure) KEY(id) VALUES (1, 'user1', '$2a$04$Ye7/lJoJin6.m9sOJZ9ujeTgHEVM4VXgI2Ingpsnf9gXyXEXf/IlW', 3456, 33 , 9000, 0);
MERGE INTO user (id, username, password, salary, age, balance, exposure) KEY(id) VALUES (2, 'user2', '$2a$04$StghL1FYVyZLdi8/DIkAF./2rz61uiYPI3.MaAph5hUq03XKeflyW', 7823, 23, 9000, 0);
MERGE INTO user (id, username, password, salary, age, balance, exposure) KEY(id) VALUES (3, 'user3', '$2a$04$Lk4zqXHrHd82w5/tiMy8ru9RpAXhvFfmHOuqTmFPWQcUhBD8SSJ6W', 4234, 45, 9000, 0);
MERGE INTO user (id, username, password, salary, age, balance, exposure) KEY(id) VALUES (4, 'akshay', '$2a$04$Lk4zqXHrHd82w5/tiMy8ru9RpAXhvFfmHOuqTmFPWQcUhBD8SSJ6W', 20000, 24, 9000, 0);
MERGE INTO user (id, username, password, salary, age, balance, exposure) KEY(id) VALUES (5, 'tanmay', '$2a$10$O6WwyKiz4hGqksGOnkwbz.pXWVnYNqP6j00beE56zl3QZKsimhXYW', 4234, 45, 9000, 0);
MERGE INTO user_roles KEY(user_id, role_id) VALUES (1, 4);
MERGE INTO user_roles KEY(user_id, role_id) VALUES (2, 5);
MERGE INTO user_roles KEY(user_id, role_id) VALUES (4, 4);
MERGE INTO user_roles KEY(user_id, role_id) VALUES (5, 4);
