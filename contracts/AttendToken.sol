// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AttendToken is ERC20, Ownable {
    struct Student {
        string name;
        string roll;
        bool registered;
        uint256 attendanceCount;
        uint256[] timestamps;
    }

    mapping(address => Student) private students;
    address[] private studentList;

    event StudentAdded(address indexed student, string name, string roll);
    event AttendanceMarked(address indexed student, uint256 timestamp);

    constructor() ERC20("ATTEND", "ATT") Ownable(msg.sender) {}

    function addStudent(address studentAddr, string calldata name, string calldata roll) external onlyOwner {
        require(!students[studentAddr].registered, "Already registered");
        students[studentAddr].registered = true;
        students[studentAddr].name = name;
        students[studentAddr].roll = roll;
        studentList.push(studentAddr);
        emit StudentAdded(studentAddr, name, roll);
    }

    function markAttendance(address[] calldata presentStudents) external onlyOwner {
        for (uint i = 0; i < presentStudents.length; i++) {
            address s = presentStudents[i];
            if (students[s].registered) {
                students[s].attendanceCount += 1;
                students[s].timestamps.push(block.timestamp);
                _mint(s, 1 * 10 ** decimals());
                emit AttendanceMarked(s, block.timestamp);
            }
        }
    }

    function isRegistered(address studentAddr) external view returns (bool) {
        return students[studentAddr].registered;
    }

    function getAttendanceCount(address studentAddr) external view returns (uint256) {
        return students[studentAddr].attendanceCount;
    }

    function getTimestamps(address studentAddr) external view returns (uint256[] memory) {
        return students[studentAddr].timestamps;
    }

    function getAllStudents() external view returns (address[] memory) {
        return studentList;
    }

    function getStudentDetails(address studentAddr) external view returns (string memory name, string memory roll, uint256 attendanceCount) {
        Student storage student = students[studentAddr];
        require(student.registered, "Student not registered");
        return (student.name, student.roll, student.attendanceCount);
    }
}
