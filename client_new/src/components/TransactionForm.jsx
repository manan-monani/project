import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { createTransaction } from "../api/transactionApi";
import './TransactionForm.css';

const TransactionForm = ({ onTransactionSuccess, token }) => {
	const [amount, setAmount] = useState("");
	const [deviceId, setDeviceId] = useState("");
	const [location, setLocation] = useState({ latitude: "", longitude: "" });
	const [error, setError] = useState("");
	const [userId, setUserId] = useState("");

	// Automatically generate or fetch user ID
	useEffect(() => {
		let storedUserId = localStorage.getItem("user_id");
		if (!storedUserId) {
			storedUserId = uuidv4();
			localStorage.setItem("user_id", storedUserId);
		}
		setUserId(storedUserId);
	}, []);
	// Automatically generate or fetch device ID
	useEffect(() => {
		let storedDeviceId = localStorage.getItem("device_id");
		if (!storedDeviceId) {
			storedDeviceId = uuidv4();
			localStorage.setItem("device_id", storedDeviceId);
		}
		setDeviceId(storedDeviceId);
	}, []);

	// Automatically fetch device location when component mounts
	useEffect(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					setLocation({
						latitude: pos.coords.latitude,
						longitude: pos.coords.longitude,
					});
				},
				(err) => {
					console.error("Error getting location:", err);
					setError("Location access is required for transactions.");
				}
			);
		} else {
			setError("Geolocation is not supported by your browser.");
		}
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (
			!amount ||
			!deviceId ||
			!location.latitude ||
			!location.longitude ||
			!userId
		) {
			setError("All fields are required, including location and user ID.");
			return;
		}

		const transactionData = {
			userID: userId, // ✅ Fix: Use correct userID
			amount: Number(amount),
			location: `${location.longitude}`,
			deviceID: deviceId,
			time: Math.floor(Date.now() / 1000),
		};

		try {
			// Step 1: Send data to ML model API
			const mlResponse = await fetch("http://127.0.0.1:5000/predict", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(transactionData),
			});

			// Ensure successful response
			if (!mlResponse.ok) {
				const errorText = await mlResponse.text(); // Get detailed error message
				setError(`Transaction failed: ${errorText}`);
				return;
			}

			const mlResult = await mlResponse.json();

			if (mlResult.isFraud) {
				setError("Transaction flagged as fraudulent. Please try again.");
				return;
			}
			if (!mlResult.isFraud) {
				// Step 2: If genuine, proceed with transaction creation
				await createTransaction(
					{ amount, deviceLocation: location, deviceId },
					token
				);
				onTransactionSuccess();
				setAmount("");
			}
		} catch (err) {
			console.error("Error:", err);
			setError("Transaction failed. Try again.");
		}
	};

	return (
		<div className="transaction-form">
			<span>Make a Transaction</span>
			{error && <p style={{ color: "red" }}>{error}</p>}
			<form onSubmit={handleSubmit}>
				<input
					type="number"
					placeholder="Enter Amount"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					required
				/>
				<button type="submit">Send Transaction</button>
			</form>
		</div>
	);
};

export default TransactionForm;
