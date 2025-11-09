import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddress } from './contractInfo';
import { contractABI } from './contractABI';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const [studentAddress, setStudentAddress] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [presentStudents, setPresentStudents] = useState('');

  const [allStudents, setAllStudents] = useState([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);

  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);
    } else {
      console.error("Please install MetaMask!");
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(contractAddress, contractABI, signer);

      setAccount(accounts[0]);
      setSigner(signer);
      setContract(contractInstance);

      const owner = await contractInstance.owner();
      setIsOwner(accounts[0].toLowerCase() === owner.toLowerCase());

      fetchStudentData(accounts[0], contractInstance);
      fetchAllStudents(contractInstance);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const fetchStudentData = async (currentAccount, contractInstance) => {
    const isRegistered = await contractInstance.isRegistered(currentAccount);
    if (isRegistered) {
      const count = await contractInstance.getAttendanceCount(currentAccount);
      const balance = await contractInstance.balanceOf(currentAccount);
      setAttendanceCount(Number(count));
      setTokenBalance(ethers.formatUnits(balance, 18));
    } else {
      setAttendanceCount(0);
      setTokenBalance(0);
    }
  };

  const fetchAllStudents = async (contractInstance) => {
    try {
      const studentAddresses = await contractInstance.getAllStudents();
      
      const studentDetails = await Promise.all(
        studentAddresses.map(async (address) => {
          const [name, roll, attendanceCount] = await contractInstance.getStudentDetails(address);
          return { address, name, roll, attendanceCount };
        })
      );

      setAllStudents(studentDetails);
    } catch (error) {
      console.error("Error fetching all students:", error);
      toast.error("Error fetching registered students. See console for details.");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (contract && isOwner) {
      try {
        const tx = await contract.addStudent(studentAddress, studentName, studentRoll);
        await tx.wait();
        toast.success('Student added successfully!');
        setStudentAddress('');
        setStudentName('');
        setStudentRoll('');
        fetchAllStudents(contract);
      } catch (error) {
        console.error("Error adding student:", error);
        toast.error('Error adding student. See console for details.');
      }
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (contract && isOwner) {
      try {
        const addresses = presentStudents
          .split(',')
          .map(addr => addr.trim())
          .filter(Boolean);

        const tx = await contract.markAttendance(addresses);
        await tx.wait();
        toast.success('Attendance marked successfully!');
        setPresentStudents('');

        if (account) {
          fetchStudentData(account, contract);
        }
      } catch (error) {
        console.error("Error marking attendance:", error);
        toast.error('Error marking attendance. See console for details.');
      }
    }
  };

  return (
    <div className="App">
      <Toaster />
      <header className="App-header">
        <h1>Token-Based Attendance System</h1>
        <p className="subhead">Manage class roll calls and reward students with on-chain ATT tokens.</p>

        {!account ? (
          <button onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <>
            <div className="account-line">
              <span>Connected Account</span>
              <span className="tag" title={account}>{account}</span>
            </div>
            {isOwner ? (
              <p className="role-indicator">Role: Teacher (Owner)</p>
            ) : (
              <p className="role-indicator">Role: Student</p>
            )}
          </>
        )}
      </header>

      {account && (
        <main>
          {isOwner && (
            <section className="teacher-panel">
              <h2>Teacher Panel</h2>

              <form onSubmit={handleAddStudent}>
                <h3>Add Student</h3>

                <label>
                  Student Wallet Address
                  <input
                    type="text"
                    placeholder="0xabc...123"
                    value={studentAddress}
                    onChange={(e) => setStudentAddress(e.target.value)}
                    required
                    aria-label="Student wallet address"
                  />
                </label>

                <label>
                  Student Name
                  <input
                    type="text"
                    placeholder="Alice Johnson"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    aria-label="Student name"
                  />
                </label>

                <label>
                  Student Roll No.
                  <input
                    type="text"
                    placeholder="IMT-069"
                    value={studentRoll}
                    onChange={(e) => setStudentRoll(e.target.value)}
                    required
                    aria-label="Student roll number"
                  />
                </label>

                <button type="submit">Add Student</button>
                <p className="helper">Adds a new student and initializes their on-chain ATT balance.</p>
              </form>

              <form onSubmit={handleMarkAttendance}>
                <h3>Mark Attendance</h3>

                <label>
                  Comma-separated student addresses
                  <input
                    type="text"
                    placeholder="0xabc..., 0xdef..., 0x123..."
                    value={presentStudents}
                    onChange={(e) => setPresentStudents(e.target.value)}
                    required
                    aria-label="Comma separated addresses"
                  />
                </label>

                <button type="submit">Mark Attendance</button>
                <p className="helper">Example: <span className="tag">0x1..., 0x2..., 0x3...</span></p>
              </form>
            </section>
          )}

          <section className="student-panel">
            <h2>Student Dashboard</h2>
            <div className="stats">
              <div className="stat">
                <div className="stat-label">Total Attendance</div>
                <div className="stat-value">{attendanceCount}</div>
              </div>
              <div className="stat">
                <div className="stat-label">ATT Token Balance</div>
                <div className="stat-value">{tokenBalance}</div>
              </div>
            </div>
          </section>

          <div className="student-list">
            <h3>Registered Students</h3>
            <ul>
              {allStudents.map((student, index) => (
                <li key={index}>
                  <strong>{student.name}</strong> 
                  <br />
                  <small>{student.address}</small>
                </li>
              ))}
            </ul>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
