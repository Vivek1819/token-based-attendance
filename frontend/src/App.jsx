import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddress } from './contractInfo';
import { contractABI } from './contractABI';
import './App.css';

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
    if (provider) {
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
    }
  };

  const fetchStudentData = async (currentAccount, contractInstance) => {
    const isRegistered = await contractInstance.isRegistered(currentAccount);
    if (isRegistered) {
      const count = await contractInstance.getAttendanceCount(currentAccount);
      const balance = await contractInstance.balanceOf(currentAccount);
      setAttendanceCount(Number(count));
      setTokenBalance(ethers.formatUnits(balance, 18));
    }
  };

  const fetchAllStudents = async (contractInstance) => {
    const students = await contractInstance.getAllStudents();
    setAllStudents(students);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (contract && isOwner) {
      try {
        const tx = await contract.addStudent(studentAddress, studentName, studentRoll);
        await tx.wait();
        alert('Student added successfully!');
        setStudentAddress('');
        setStudentName('');
        setStudentRoll('');
        fetchAllStudents(contract);
      } catch (error) {
        console.error("Error adding student:", error);
        alert('Error adding student. See console for details.');
      }
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (contract && isOwner) {
      try {
        const addresses = presentStudents.split(',').map(addr => addr.trim());
        const tx = await contract.markAttendance(addresses);
        await tx.wait();
        alert('Attendance marked successfully!');
        setPresentStudents('');
        // Re-fetch data for the current user if they are a student
        if (account) {
            fetchStudentData(account, contract);
        }
      } catch (error) {
        console.error("Error marking attendance:", error);
        alert('Error marking attendance. See console for details.');
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Token-Based Attendance System</h1>
        {!account ? (
          <button onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <div>
            <p>Connected Account: {account}</p>
            {isOwner && <p className="role-indicator">Role: Teacher (Owner)</p>}
            {!isOwner && <p className="role-indicator">Role: Student</p>}
          </div>
        )}
      </header>

      {account && (
        <main>
          {isOwner && (
            <div className="teacher-panel">
              <h2>Teacher Panel</h2>
              <form onSubmit={handleAddStudent}>
                <h3>Add Student</h3>
                <input
                  type="text"
                  placeholder="Student Wallet Address"
                  value={studentAddress}
                  onChange={(e) => setStudentAddress(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Student Name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Student Roll No."
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  required
                />
                <button type="submit">Add Student</button>
              </form>

              <form onSubmit={handleMarkAttendance}>
                <h3>Mark Attendance</h3>
                <input
                  type="text"
                  placeholder="Comma-separated student addresses"
                  value={presentStudents}
                  onChange={(e) => setPresentStudents(e.target.value)}
                  required
                />
                <button type="submit">Mark Attendance</button>
              </form>
            </div>
          )}

          <div className="student-panel">
            <h2>Student Dashboard</h2>
            <p>Total Attendance: <strong>{attendanceCount}</strong></p>
            <p>ATT Token Balance: <strong>{tokenBalance}</strong></p>
          </div>

          <div className="student-list">
            <h3>Registered Students</h3>
            <ul>
              {allStudents.map((student, index) => (
                <li key={index}>{student}</li>
              ))}
            </ul>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;