ALTER TABLE "pets" ALTER COLUMN "satiety" TYPE real USING "satiety"::real;
ALTER TABLE "pets" ALTER COLUMN "happiness" TYPE real USING "happiness"::real;
ALTER TABLE "pets" ALTER COLUMN "energy" TYPE real USING "energy"::real;
ALTER TABLE "pets" ALTER COLUMN "hygiene" TYPE real USING "hygiene"::real;
ALTER TABLE "pets" ALTER COLUMN "health" TYPE real USING "health"::real;
