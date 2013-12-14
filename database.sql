CREATE TABLE "session" (
        id BIGSERIAL PRIMARY KEY NOT NULL,
        user_id BIGINT REFERENCES "user",
        content JSON NOT NULL DEFAULT '{}'
);
