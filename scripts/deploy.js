async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Attend = await ethers.getContractFactory("AttendToken");
  const attend = await Attend.deploy();
  await attend.deployed();

  console.log("AttendToken deployed to:", attend.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
