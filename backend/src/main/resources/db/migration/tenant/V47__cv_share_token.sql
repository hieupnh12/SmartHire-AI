-- CV Builder: optional public share link. NULL = not shared; the token is the only credential for the public view.
ALTER TABLE cvs ADD COLUMN share_token VARCHAR(64) NULL;
ALTER TABLE cvs ADD CONSTRAINT uk_cvs_share_token UNIQUE (share_token);
