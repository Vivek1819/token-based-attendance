async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Attend = await ethers.getContractFactory("AttendToken");
  const attend = await Attend.deploy();
  // ethers v6 / hardhat toolbox: wait for deployment using waitForDeployment()
  await attend.waitForDeployment();

  // use getAddress() to fetch the deployed contract address
  const attendAddress = await attend.getAddress();
  console.log("AttendToken deployed to:", attendAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
