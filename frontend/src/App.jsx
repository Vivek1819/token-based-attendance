import { useState, useEffect, useMemo } from 'react';
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

  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [search, setSearch] = useState('');

  const formatAddress = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter((s) =>
      [s.name, s.roll, s.address].some((t) => String(t ?? '').toLowerCase().includes(q))
    );
  }, [search, allStudents]);

  const allVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudents.includes(s.address));

  useEffect(() => {
    if (account && contract) {
      fetchStudentData(account, contract);
      fetchAllStudents(contract);
    }
  }, [account, contract]);

  useEffect(() => {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);

      window.ethereum.on?.('accountsChanged', () => {
        setAccount(null);
        setSigner(null);
        setContract(null);
        setIsOwner(false);
        setSelectedStudents([]);
      });
      window.ethereum.on?.('chainChanged', () => {
        window.location.reload();
      });
    } else {
      console.error('Please install MetaMask!');
      toast.error('Please install MetaMask to use this application.');
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const s = await provider.getSigner();
      const c = new ethers.Contract(contractAddress, contractABI, s);

      setAccount(accounts[0]);
      setSigner(s);
      setContract(c);

      const owner = await c.owner();
      setIsOwner(accounts[0].toLowerCase() === owner.toLowerCase());

      fetchStudentData(accounts[0], c);
      fetchAllStudents(c);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Error connecting wallet. See console for details.');
    }
  };

  const fetchStudentData = async (currentAccount, contractInstance) => {
    try {
      setIsLoading(true);
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
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Error fetching student data. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllStudents = async (contractInstance) => {
    try {
      setIsLoading(true);
      const studentAddresses = await contractInstance.getAllStudents();
      const studentDetails = await Promise.all(
        studentAddresses.map(async (address) => {
          const [name, roll, count] = await contractInstance.getStudentDetails(address);
          return { address, name, roll, attendanceCount: Number(count) };
        })
      );
      studentDetails.sort((a, b) => a.name.localeCompare(b.name));
      setAllStudents(studentDetails);
    } catch (error) {
      console.error('Error fetching all students:', error);
      toast.error('Error fetching registered students. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!(contract && isOwner)) return;
    try {
      setIsSubmitting(true);
      const tx = await contract.addStudent(
        studentAddress.trim(),
        studentName.trim(),
        studentRoll.trim()
      );
      await tx.wait();
      toast.success('Student added successfully!');
      setStudentAddress('');
      setStudentName('');
      setStudentRoll('');
      fetchAllStudents(contract);
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Error adding student. See console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStudentSelection = (address) => {
    if (!isOwner) return;
    setSelectedStudents((prev) =>
      prev.includes(address) ? prev.filter((a) => a !== address) : [...prev, address]
    );
  };

  const toggleSelectAllVisible = () => {
    if (!isOwner) return;
    if (allVisibleSelected) {
      const visibleSet = new Set(filteredStudents.map((s) => s.address));
      setSelectedStudents((prev) => prev.filter((a) => !visibleSet.has(a)));
    } else {
      const addrs = filteredStudents.map((s) => s.address);
      setSelectedStudents((prev) => Array.from(new Set([...prev, ...addrs])));
    }
  };

  const handleMarkAttendance = async () => {
    if (!(contract && isOwner)) return;
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to mark attendance.');
      return;
    }
    try {
      setIsMarking(true);
      const tx = await contract.markAttendance(selectedStudents);
      await tx.wait();
      toast.success('Attendance marked for selected students!');
      setSelectedStudents([]);
      fetchAllStudents(contract);
      if (account) fetchStudentData(account, contract);
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Error marking attendance. See console for details.');
    } finally {
      setIsMarking(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="viewport">       {/* 100vh x 100vw centered */}
      <div className="app-shell">    {/* header + body in ONE centered card */}
        <header className="topbar">
          <div className="brand">
            <span className="logo-dot" />
            <span className="brand-text">ATTendance</span>
          </div>
          <div className="nav-right">
            {account ? (
              <div className="wallet-wrap">
                <span className="pill">{isOwner ? 'Teacher' : 'Student'}</span>
                <span className="addr">{formatAddress(account)}</span>
              </div>
            ) : (
              <button className="btn primary" onClick={connectWallet}>Connect Wallet</button>
            )}
          </div>
        </header>
        <main className="shell-body">{children}</main>
      </div>
    </div>
  );

  return (
    <div className="App">
      <Toaster />
      <Shell>
        {account ? (
          <div className="layout">
            <aside className="sidebar panel">
              <div className="user-card">
                <div className="avatar">{isOwner ? '👩‍🏫' : '🎓'}</div>
                <div>
                  <div className="user-title">{isOwner ? 'Teacher Dashboard' : 'Student Dashboard'}</div>
                  <div className="user-subtitle">{formatAddress(account)}</div>
                </div>
              </div>

              <div className="metric-stack">
                <div className="metric-card">
                  <div className="metric-label">Total Attendance</div>
                  <div className="metric-value">{isLoading ? '—' : attendanceCount}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">ATT Token Balance</div>
                  <div className="metric-value">{isLoading ? '—' : tokenBalance}</div>
                </div>
              </div>

              {isOwner && (
                <form className="add-form" onSubmit={handleAddStudent}>
                  <div className="section-title">Add Student</div>
                  <input type="text" placeholder="Wallet address" value={studentAddress}
                    onChange={(e) => setStudentAddress(e.target.value)} required />
                  <input type="text" placeholder="Full name" value={studentName}
                    onChange={(e) => setStudentName(e.target.value)} required />
                  <input type="text" placeholder="Roll number" value={studentRoll}
                    onChange={(e) => setStudentRoll(e.target.value)} required />
                  <button className="btn primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding…' : 'Add Student'}
                  </button>
                </form>
              )}
            </aside>

            <section className="content panel">
              <div className="content-header">
                <h2 className="panel-title">Registered Students</h2>
                <div className="actions-row">
                  <input
                    className="search"
                    type="text"
                    placeholder="Search by name, roll or address…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {isOwner && (
                    <button
                      className="btn ghost"
                      onClick={toggleSelectAllVisible}
                      disabled={filteredStudents.length === 0}
                      title={allVisibleSelected ? 'Unselect all visible' : 'Select all visible'}
                    >
                      {allVisibleSelected ? 'Unselect All' : 'Select All'}
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="empty">Loading students…</div>
              ) : filteredStudents.length === 0 ? (
                <div className="empty">
                  {allStudents.length === 0 ? 'No students registered yet.' : 'No matches for your search.'}
                </div>
              ) : (
                <div className="student-grid">
                  {filteredStudents.map((s) => {
                    const selected = selectedStudents.includes(s.address);
                    return (
                      <button
                        key={s.address}
                        type="button"
                        className={`student-card ${selected ? 'selected' : ''} ${isOwner ? 'clickable' : ''}`}
                        onClick={() => toggleStudentSelection(s.address)}
                        aria-pressed={selected}
                      >
                        <div className="student-top">
                          <div className="student-name">{s.name}</div>
                          {isOwner && (
                            <div className={`chip ${selected ? 'ok' : 'neutral'}`}>
                              {selected ? 'Present' : 'Absent'}
                            </div>
                          )}
                        </div>
                        <div className="student-meta">
                          <span className="badge">Roll: {s.roll}</span>
                          <span className="badge">Attendance: {s.attendanceCount}</span>
                        </div>
                        <div className="student-addr">{formatAddress(s.address)}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {isOwner && (
                <div className="bar-row">
                  <div className="sticky-info">Selected: <b>{selectedStudents.length}</b></div>
                  <button
                    className="btn primary"
                    onClick={handleMarkAttendance}
                    disabled={selectedStudents.length === 0 || isMarking}
                  >
                    {isMarking ? 'Marking…' : 'Mark Attendance'}
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="panel hero">
            <h1 className="hero-title">Token-Based Attendance</h1>
            <p className="hero-sub">
              Reward presence with tokens. Teachers add students, select them, and mark attendance in one click.
            </p>
            <button className="btn primary" onClick={connectWallet}>Connect MetaMask to Start</button>
          </div>
        )}
      </Shell>
    </div>
  );
}

export default App;
