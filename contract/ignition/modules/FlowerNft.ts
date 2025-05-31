import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FlowerNft", (m) => {
  const flowNft = m.contract("FlowerNft", ["https://ipfs.io/ipns/k51qzi5uqu5dgbofq0huravoum2mono10rkgisoekxhm25478txkz6bcyj17cc?adress="]);

  return { flowNft };
});