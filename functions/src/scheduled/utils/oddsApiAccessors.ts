import axios from "axios";
import { OddsApiResponse, Event, Sport } from "../types";
import { defineString } from "firebase-functions/params";

const regions = defineString("REGIONS");

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

export const getOdds = async (
  apiKey: string,
  oddsApiUrl: string,
  sport: string
) => {
  const oddsResponse = (await axios.get(
    `${oddsApiUrl}/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=${regions.value()}&markets=h2h,totals`
  )) as OddsApiResponse;

  if (oddsResponse.status !== 200) {
    throw new Error(`Failed to fetch sports: ${oddsResponse.statusText}`);
  }
  const data = oddsResponse.data as Event[];
  return data;
};
