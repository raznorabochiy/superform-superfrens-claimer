import cli from "cli";
import { Wallet } from "ethers";
import random from "lodash/random";
import shuffle from "lodash/shuffle";
import select from "@inquirer/select";
import { DELAY, KEYS_FILENAME, SHUFFLE_KEYS } from "./constants";
import { claim, getClaimData } from "./claim";
import { delayProgress, loadFromFile } from "./utils";

let keys = await loadFromFile(KEYS_FILENAME);

if (SHUFFLE_KEYS) {
  keys = shuffle(keys);
}

const tournamentID = await select({
  message: "Выберите номер турнира:",
  choices: [0, 1, 2, 3, 4].map((value) => ({
    name: `TOURNAMENT ${value}`,
    value,
  })),
});

for (const key of keys) {
  const { address } = new Wallet(key);
  console.log(`===== Address: ${address} ======`);

  try {
    const data = await getClaimData(address, tournamentID);

    if (data.error) {
      throw new Error(data.error);
    }

    await claim(key, data);
  } catch (e) {
    cli.spinner("", true);
    console.log("Ошибка:", e.message);
  }

  const [delayFrom, delayTo] = DELAY;
  const delayTimeout = random(delayFrom, delayTo);
  await delayProgress(delayTimeout);
}
