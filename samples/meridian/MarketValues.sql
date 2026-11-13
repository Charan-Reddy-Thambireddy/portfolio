-- database/010_market_values.sql
CREATE TABLE dbo.MarketValue
(
    CategoryId   VARCHAR(40)    NOT NULL REFERENCES dbo.Category (CategoryId),
    CountryId    CHAR(2)        NOT NULL REFERENCES dbo.Country (CountryId),
    MetricId     TINYINT        NOT NULL,          -- 1 value, 2 volume, 3 per capita
    [Year]       SMALLINT       NOT NULL CHECK ([Year] BETWEEN 1990 AND 2050),
    Value        DECIMAL(19, 4) NOT NULL,
    Unit         VARCHAR(30)    NOT NULL,
    IsForecast   BIT            NOT NULL,
    ReleaseId    INT            NOT NULL REFERENCES dbo.DataRelease (ReleaseId),
    CONSTRAINT PK_MarketValue PRIMARY KEY (MetricId, CategoryId, CountryId, [Year])
);

-- Wide year-range scans for dashboards and exports.
CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_MarketValue
    ON dbo.MarketValue (CategoryId, CountryId, MetricId, [Year], Value, IsForecast);
GO

-- CAGR between two years for every market in a category group, for report generation.
CREATE OR ALTER PROCEDURE dbo.usp_GroupGrowth
    @GroupId  VARCHAR(40),
    @FromYear SMALLINT,
    @ToYear   SMALLINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @ToYear <= @FromYear
        THROW 50010, N'ToYear must be after FromYear.', 1;

    WITH Endpoints AS
    (
        SELECT  v.CategoryId, v.CountryId,
                StartValue = MAX(CASE WHEN v.[Year] = @FromYear THEN v.Value END),
                EndValue   = MAX(CASE WHEN v.[Year] = @ToYear   THEN v.Value END)
        FROM    dbo.MarketValue AS v
        JOIN    dbo.Category    AS c ON c.CategoryId = v.CategoryId
        WHERE   c.GroupId = @GroupId
          AND   v.MetricId = 1
          AND   v.[Year] IN (@FromYear, @ToYear)
        GROUP BY v.CategoryId, v.CountryId
    )
    SELECT  CategoryId, CountryId, StartValue, EndValue,
            Cagr = POWER(EndValue / NULLIF(StartValue, 0), 1.0 / (@ToYear - @FromYear)) - 1
    FROM    Endpoints
    WHERE   StartValue IS NOT NULL AND EndValue IS NOT NULL
    ORDER BY Cagr DESC;
END;
