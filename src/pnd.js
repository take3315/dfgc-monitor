const { ethers } = require("ethers");
const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL);
const poolABI = require("../abi/Pnd.json");
const tokenABI = require("../abi/Token.json");

const poolConfigs = [
  {
    contractAddress: "0xaa59f501c92092e624d30cff77eaff5ea4e7bfa2",
    displayName: "PND CJPY",
  },
  {
    contractAddress: "0xE0e2d860797eF02F18c474847787A6C8f8389044",
    displayName: "PND CRVUSD",
  },
  {
    contractAddress: "0x2bf8B07e41572FB09d9F002b2500E3eeDC5d7922",
    displayName: "PND ETH",
  },
  {
    contractAddress: "0x7a997e2D7C84abb219832d944141de210e2840e1",
    displayName: "PND USDC",
  },
  {
    contractAddress: "0x68cBE77063dbCF7de7F59cD8c0051e0B2A23BF75",
    displayName: "PND JPYC",
  },
];

const calculateRate = (rateUint) => {
  return (Math.round((rateUint * 31536000) / 1e15) / 10).toFixed(1);
};

const calculateAmount = (amountUint, decimals) => {
  return Math.round(amountUint / 10 ** decimals).toLocaleString();
};

const pndRun = async () => {
  const results = [];

  for (const config of poolConfigs) {
    try {
      const contract = new ethers.Contract(config.contractAddress, poolABI, provider);
      const baseToken = new ethers.Contract(await contract.baseToken(), tokenABI, provider);
      const decimals = await baseToken.decimals();
      const utilUint = await contract.getUtilization();
      const borrowRate = calculateRate(await contract.getBorrowRate(utilUint));
      const supplyRate = calculateRate(await contract.getSupplyRate(utilUint));
      const reserve = calculateAmount(await contract.getReserves(), decimals);
      const supply = calculateAmount(await contract.totalSupply(), decimals);
      const borrow = calculateAmount(await contract.totalBorrow(), decimals);
      
      results.push({
        displayName: config.displayName,
        utilization: `${Math.round(utilUint / 1e16)}%`,
        supply: `${supply} @ ${supplyRate}%`,
        borrow: `${borrow} @ ${borrowRate}%`,
        reserves: reserve,
      });      
    } catch (err) {
      console.error(`[${config.displayName}] Error: ${err.name} - ${err.message}`);
    }
  }

  return results;
};

module.exports = { pndRun };
