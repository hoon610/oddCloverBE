import * as admin from "firebase-admin";

admin.initializeApp();

export { oddsUpdater } from "./scheduled/oddsUpdater";
export { sportsUpdater } from "./scheduled/sportsUpdater";
