require("dotenv").config();
const { ethers } = require("ethers");
const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL);

const formatYen = (value) => ethers.utils.formatEther(value);
const createContract = (address, ABI) =>
  new ethers.Contract(address, ABI, provider);

const yamatoConfigs = [
  {
    displayName: "Yamato CJPY",
    yamatoAddress: "0x02Fe72b2E9fF717EbF3049333B184E9Cd984f257",
    priceFeedAddress: "0x3f4E4Dad0AC01Da50A774F3389b70506c96FfF2f",
    priorityRegistryAddress: "0x0c9Bdf09de9EaCbE692dB2c17a75bfdB5FF4190B",
    fxrateAddress: "0xbce206cae7f0ec07b545edde332a47c2f75bbeb3",
  },
];

const yamatoRun = async () => {
  const results = [];

  for (const config of yamatoConfigs) {
    try {
      const ABI = require("../abi/Yamato.json");
      const PriceFeedABI = require("../abi/PriceFeedV3.json");
      const PriorityRegistryABI = require("../abi/PriorityRegistryV6.json");

      const yamatoContract = createContract(config.yamatoAddress, ABI);
      const priceFeedContract = createContract(config.priceFeedAddress, PriceFeedABI);
      const priorityRegistryContract = createContract(config.priorityRegistryAddress, PriorityRegistryABI);
      const fxratecontract = createContract(config.fxrateAddress, require("../abi/Chainlink.json"));

      const states = await yamatoContract.getStates();
      const rateOfEthJpy = Number(formatYen(await priceFeedContract.getPrice()));
      const totalCollateralETH = (states[0] * rateOfEthJpy) / 10 ** 18;
      const totalSupplyCDP = states[1] / 10 ** 18;

      const tcr = totalSupplyCDP === 0 ? 0 : ((totalCollateralETH / totalSupplyCDP) * 100).toFixed(2);

      let redeemablesCandidate = await priorityRegistryContract.getRedeemablesCap();
      redeemablesCandidate = redeemablesCandidate !== 0 ? redeemablesCandidate / 10 ** 18 : 0;

      const res = await fxratecontract.latestRoundData();
      const resFX = res.answer;
      const jpyPerUSDToFixed = (10 ** 8 / resFX).toFixed(2);

      const res2 = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=convertible-jpy-token&vs_currencies=jpy");
      const resJSON2 = await res2.json();
      const cdpPerJPY = Number(resJSON2["convertible-jpy-token"]["jpy"]);
      const diff = ((cdpPerJPY - 1) * 100).toFixed(2);
      const cdpPerUSDToFixed = (jpyPerUSDToFixed / cdpPerJPY).toFixed(2);

      results.push({
        displayName: config.displayName,
        totalCollateral: `¥${parseInt(totalCollateralETH).toLocaleString()}`,
        totalSupplyCDP: `¥${parseInt(totalSupplyCDP).toLocaleString()}`,
        tcr: `${tcr}%`,
        redeemablesCandidate,
        exchangeRateDiff: `${diff}%`,
        jpyPerUSD: jpyPerUSDToFixed,
        cdpPerUSD: cdpPerUSDToFixed,
      });
    } catch (err) {
      results.push({
        displayName: config.displayName,
        error: `${err.name} - ${err.message}`,
      });
    }
  }

  return results;
};

module.exports = {
  yamatoRun,
};
