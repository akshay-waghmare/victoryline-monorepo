-- Baseline schema migrated from schema.sql
-- Compatible with H2 (ignore engine clause) and MySQL
create table if not exists role (id bigint not null auto_increment, description varchar(255), name varchar(255), primary key (id)) engine=MyISAM;
create table if not exists user (id bigint not null auto_increment, age integer, password varchar(255), salary bigint, username varchar(255), balance decimal(10,2), exposure decimal(10,2), primary key (id)) engine=MyISAM;
create table if not exists user_roles (user_id bigint not null, role_id bigint not null, primary key (user_id, role_id)) engine=MyISAM;
create table if not exists bets(
  betId bigint not null auto_increment,
  user_id bigint not null,
  betType varchar(20),
  amount decimal(10,2),
  odd decimal(10,2),
  potentialWin decimal(10,2),
  status varchar(20),
  placedAT DATETIME,
  foreign key (user_Id) references user(id),
  primary key (betId)
) engine=MyISAM;
create table if not exists transaction(
  transaction_id bigint not null auto_increment,
  user_id bigint not null,
  transaction_Type varchar(20) not null,
  amount decimal(10,2) not null,
  transaction_Date DATETIME not null,
  status varchar(20) not null,
  remark varchar(20) null,
  fromto varchar(20) null,
  balance_After_transaction decimal(10,2) not null,
  foreign key (user_Id) references user(id),
  primary key (transaction_id)
) engine=MyISAM;
create table if not exists matches(
  match_id bigint not null,
  home_Team_name varchar(20) not null,
  away_Team_name varchar(20) not null,
  match_date datetime not null,
  sport_type varchar(20) not null,
  competition varchar(20) not null,
  match_status varchar(20) not null,
  result varchar(20) null,
  odd float null,
  location varchar(20) null,
  visibility boolean not null default true,
  match_link varchar(20) not null,
  primary key(match_id)
) engine=MyISAM;
-- Constraints
ALTER TABLE user_roles ADD CONSTRAINT IF NOT EXISTS FKrhfovtciq1l558cw6udg0h0d3 FOREIGN KEY (role_id) REFERENCES role (id);
ALTER TABLE user_roles ADD CONSTRAINT IF NOT EXISTS FK55itppkw3i07do3h7qoclqd4k FOREIGN KEY (user_id) REFERENCES user (id);
