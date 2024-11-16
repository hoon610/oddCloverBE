import axios, { AxiosError } from "axios";
import { OddsApiResponse, Sport, CombinedOddsData, Event } from "../types";
import { logger } from "firebase-functions/v2";
import { delay } from "../../helpers/delay";


/**
 * Retrieves the list of sports from the Odds API
 * @param {string} apiKey The API key for the Odds API
 * @param {string} oddsApiUrl The base URL for the Odds API
 * @return {Promise<{sports: Sport[], allSports: Sport[]}>} The arrays of sports and all sports
 */
export const getSports = async (apiKey: string, oddsApiUrl: string) => {
  const sportsResponse = (await axios.get(
    `${oddsApiUrl}/v4/sports?apiKey=${apiKey}&all=true`
  )) as OddsApiResponse;
  if (sportsResponse.status !== 200) {
    throw new Error(`Failed to fetch sports: ${sportsResponse.statusText}`);
  }
  const data = sportsResponse.data as Sport[];
  return data;
};

/**
 * fetchOdds retrieves the odds for a specific sport from the Odds API
 * @param {string} apiKey The API key for the Odds API
 * @param {string} oddsApiUrl The base URL for the Odds API
 * @param {string[]} sports The list of sports to fetch odds for
 * @param {number} batchSize The number of sports to fetch in each batch
 * @param {number} delayMs The delay in milliseconds between batches
 * @return {Promise<CombinedOddsData>} The combined odds data for all sports
 */
export const batchFetchOdds = async (
  apiKey: string,
  oddsApiUrl: string,
  sports: string[],
  batchSize = 5,
  delayMs = 1500
): Promise<CombinedOddsData> => {
  const combinedOddsData: CombinedOddsData = {};
  const errors: Record<string, unknown> = {};
  // Process sports in batches
  for (let i = 0; i < sports.length; i += batchSize) {
    const batch = sports.slice(i, i + batchSize);

    logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sports.length / batchSize)}`, {
      sports: batch,
    });

    // Process each sport in the batch
    const batchPromises = batch.map(async (sport) => {
      try {
        const response = await axios.get(
          `${oddsApiUrl}/v4/sports/${sport}/odds`,
          {
            params: {
              apiKey,
              regions: "us,us2",
              markets: "h2h,totals,spreads",
              includeLinks: true,
              includeSids: true,
            },
            timeout: 10000,
            validateStatus: (status) => status === 200,
          }
        );

        const data = response.data as Event[];
        if (!data) {
          return;
        }
        combinedOddsData[sport] = data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const errorMessage = axiosError.response?.status === 401 ?
          "Invalid API key or unauthorized access" :
          axiosError.message;

        errors[sport] = {
          message: errorMessage,
          status: axiosError.response?.status,
        };

        logger.error(`Failed to fetch odds for ${sport}`, {
          error: errorMessage,
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
      }
    });

    // Wait for current batch to complete
    await Promise.all(batchPromises);

    // Delay before next batch if there are more sports to process
    if (i + batchSize < sports.length) {
      logger.info(`Waiting ${delayMs}ms before next batch...`);
      await delay(delayMs);
    }
  }

  // Log summary of processing
  const successCount = Object.keys(combinedOddsData).length;
  const errorCount = Object.keys(errors).length;

  logger.info("Odds fetching complete", {
    successful: successCount,
    failed: errorCount,
    failedSports: Object.keys(errors),
  });

  return combinedOddsData;
};
