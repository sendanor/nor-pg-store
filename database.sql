CREATE TABLE "session" (
        id BIGSERIAL PRIMARY KEY NOT NULL,
        content JSON NOT NULL DEFAULT '{}'
);
