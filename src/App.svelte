<!-- Created by: @kcxgu -->
<script>
	let housePrice;
	let deposit;
	let monthlyRentalIncome;
	let message = "Enter required fields below to start";

	$: depositPercent = (deposit / housePrice) * 100;
	$: stampDuty = housePrice * 0.03;
	$: yieldCalc = (annualRentalIncome / housePrice) * 100;
	$: requiredMortgage = housePrice - deposit;
	$: annualRentalIncome = monthlyRentalIncome * 12;
	$: ltv = (requiredMortgage / housePrice) * 100;
</script>

<main>
	<header>
		<h1>Property Investment Calculator</h1>
		<p class="description">Buy to Let • UK</p>
	</header>
	<div class="framework">
		<div class="framework-left">
			<img
				src="house.svg"
				alt="buy-to-let property investment calculator"
			/>
			<div class="notes">
				<p>Notes:</p>
				<ul>
					<li>
						If taking out mortgage, generally, deposit should be at
						least 25% of property price, loan-to-value should be 75%
						(subject to individual lender's requirements).
					</li>
					<li>
						Upon sale, the investment property could incur a capital
						gains tax.
					</li>
				</ul>
			</div>
		</div>

		<div class="framework-right">
			<div class="container general">
				<p class="message">{message}</p>
				<div class="calc calc-input">
					<div class="section">
						<div class="section-top">
							<p class="name">House Price</p>
						</div>
						<div class="section-bottom">
							<p>£</p>
							<input
								type="number"
								id="house-price"
								placeholder="100,000"
								bind:value={housePrice}
							/>
						</div>
					</div>
					<div class="section">
						<div class="section-top">
							<p class="name">Deposit</p>
						</div>
						<div class="section-bottom">
							<p>£</p>
							<input
								type="number"
								id="deposit"
								bind:value={deposit}
								placeholder="20,000"
							/>
						</div>
						<p class="note">
							{depositPercent || ""} <span>%</span>
						</p>
					</div>
					<div class="section">
						<div class="section-top">
							<p class="name">Stamp Duty</p>
						</div>
						<div class="section-bottom">
							<p>£</p>
							<input
								type="number"
								id="stamp-duty"
								bind:value={stampDuty}
								placeholder="We will calculate this"
								readonly
							/>
						</div>
					</div>
					<div class="section">
						<div class="section-top">
							<p class="name">Estimated Monthly Rental Income</p>
						</div>
						<div class="section-bottom">
							<p>£</p>
							<input
								type="number"
								id="monthly-rental-income"
								bind:value={monthlyRentalIncome}
								placeholder="800"
							/>
						</div>
					</div>
				</div>
				<div class="calc calc-output">
					<div class="row">
						<div class="col left">Yield:</div>
						<div class="col right">
							<span id="yield">{yieldCalc || ""}</span>%
						</div>
					</div>
					<div class="row">
						<div class="col left">Mortgage Required:</div>
						<div class="col right">
							<span id="mortgage">£{requiredMortgage || ""}</span>
						</div>
					</div>
					<div class="row">
						<div class="col left">Loan-to-Value:</div>
						<div class="col right">
							<span id="ltv">{ltv || ""}</span>%
						</div>
					</div>
					<div class="row">
						<div class="col left">Annual Rental Income:</div>
						<div class="col right">
							<span id="annual-rental-income"
								>£{annualRentalIncome || ""}</span
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	main {
		text-align: center;
		padding: 2rem;
		margin: 0 auto;
		max-width: 800px;
	}

	h1 {
		color: #1d1d1d;
		font-size: 3rem;
		font-weight: 100;
	}

	.description {
		padding: 1rem 0;
	}

	img {
		max-width: 70%;
		height: auto;
		padding-bottom: 1rem;
	}

	.notes {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-right: 2rem;
		text-align: justify;
	}

	.message {
		margin: 0.5rem auto;
		background-color: var(--light-green);
		color: var(--matte-green);
		border-radius: 5px;
		padding: 0.5rem 1rem;
		max-width: fit-content;
	}

	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem 0;
	}

	.section {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.section-bottom {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.section-bottom p {
		padding-left: 0.25rem;
	}

	.name {
		padding-top: 0.5rem;
	}

	input {
		border: 1px solid gray;
		border-radius: 5px;
		margin: 0.5rem auto;
		padding: 0.2rem 0.3rem;
	}

	.row {
		display: flex;
		/* border: 1px solid black; */
	}

	.col {
		flex: 50%;
		align-items: center;
		justify-content: center;
		/* border: 1px solid black; */
		width: 30vw;
		padding: 0.5rem 0;
	}

	.left {
		text-align: right;
		padding-right: 1rem;
	}

	.right {
		text-align: left;
	}

	.note {
		font-size: 0.8rem;
	}

	@media (min-width: 640px) {
		main {
			max-width: 800px;
		}

		h1 {
			font-size: 4rem;
		}

		.calc {
			display: flex;
			flex-direction: column;
			max-width: 80%;
		}

		.calc-input {
			display: grid;
			grid-template-columns: auto auto;
			padding: 0.5rem 0;
			gap: 1rem;
		}
	}

	@media (min-width: 1024px) {
		.framework {
			display: flex;
			align-items: center;
			justify-content: center;
			max-width: 800px;
			margin: 0 5rem;
		}

		.framework-left {
			flex: 30%;
			min-width: 60%;
			width: 100%;
			font-size: 1rem;
		}

		.framework-right {
			flex: 70%;
			align-items: center;
			width: 100%;
			font-size: 1.125rem;
		}

		.notes p {
			line-height: 125%;
		}

		.notes ul {
			padding: 0.5rem 0;
		}

		.notes li {
			padding: 0.5rem 0;
		}

		img {
			min-width: 90%;
			padding: 2rem 0;
		}

		.general {
			display: flex;
			padding: 1rem 0;
			gap: 1.5rem;
		}

		.message {
			max-width: fit-content;
		}

		input {
			padding: 0.5rem 0.75rem;
		}
	}
</style>
