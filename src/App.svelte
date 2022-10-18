<!-- Created by: @kcxgu -->
<script>
	let housePrice;
	let deposit;
	let monthlyRentalIncome;
	let fees;
	let oneOffCost;
	let monthlyMortgage;
	let monthlyCosts;

	$: depositPercent = (deposit / housePrice) * 100;
	$: yieldCalc = (annualRentalIncome / housePrice) * 100;
	$: requiredMortgage = housePrice - deposit;
	$: annualRentalIncome = monthlyRentalIncome * 12;
	$: ltv = (requiredMortgage / housePrice) * 100;

	$: monthlyProfit = monthlyRentalIncome - monthlyCosts - monthlyMortgage;
	$: annualProfit = monthlyProfit * 12;
	$: breakEven = Math.round((fees + oneOffCost) / annualProfit);
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
						Upon sale, the investment property could incur a capital
						gains tax (not included in the calculations below).
					</li>
					<li>
						More helpful information are available on the UK
						government's website: <a
							href="https://www.moneyhelper.org.uk/en/homes/buying-a-home/buy-to-let-mortgages-explained"
							>Money Helper</a
						>
					</li>
				</ul>
			</div>
		</div>
		<!-- Beginning Input and Output -->
		<div class="framework-right">
			<!-- Beginning General Input and Output -->
			<h3>General Calculations</h3>
			<div class="container general">
				{#if depositPercent < 25}
					<p class="warning">
						Generally, deposit should be at least 25% of property
						price
					</p>
				{:else}
					<p class="message">
						Enter required fields below to continue
					</p>
				{/if}
				<!-- Beginning General Input-->
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
							{#if !housePrice}
								<input
									type="number"
									id="stamp-duty"
									value=""
									placeholder="We will calculate this"
									readonly
								/>
							{:else if housePrice <= 40000}
								<input
									type="number"
									id="stamp-duty"
									value="0"
									readonly
								/>
							{:else if housePrice > 40000 && housePrice <= 250000}
								<input
									type="number"
									id="stamp-duty"
									value={housePrice * 0.03}
									readonly
								/>
							{:else if housePrice > 250000 && housePrice <= 925000}
								<input
									type="number"
									id="stamp-duty"
									value={250000 * 0.03 +
										(housePrice - 250000) * 0.08}
									readonly
								/>
							{:else if housePrice > 925000 && housePrice <= 1500000}
								<input
									type="number"
									id="stamp-duty"
									value={250000 * 0.03 +
										(925000 - 250000) * 0.08 +
										(housePrice - 925000) * 0.13}
									readonly
								/>
							{:else if housePrice > 1500000}
								<input
									type="number"
									id="stamp-duty"
									value={250000 * 0.03 +
										(925000 - 250000) * 0.08 +
										(1500000 - 925000) * 0.13 +
										(housePrice - 1500000) * 0.15}
									readonly
								/>
							{/if}
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
				<!--Beginning General Output-->
				<div class="calc calc-output">
					<div class="row">
						<div class="col left note">Stamp Duty Notes:</div>
						<div class="col right note">
							{#if !housePrice}
								<p>Remember, stamp duty is tiered</p>
							{:else if housePrice <= 40000}
								<p>
									No stamp duty required for properties below
									£40,000
								</p>
							{:else if housePrice > 40000 && housePrice <= 250000}
								<p>
									For properties between £40,001 and £250,000,
									3% on full property price
								</p>
							{:else if housePrice > 250000 && housePrice <= 925000}
								<p>
									For properties between £250,001 and
									£925,000, 8% tiered
								</p>
							{:else if housePrice > 925000 && housePrice <= 1500000}
								<p>
									For properties between £925,001 and £1.5m,
									13% tiered
								</p>
							{:else if housePrice > 1500000}
								<p>For properties above £1.5m, 15% tiered</p>
							{/if}
						</div>
					</div>
					<div class="row">
						<div class="col left">Yield:</div>
						<div class="col right">
							<span id="yield">{yieldCalc || ""}</span>%
						</div>
					</div>
					<div class="row">
						<div class="col left">Mortgage Required:</div>
						<div class="col right">
							{#if !requiredMortgage}
								<p>£</p>
							{:else}
								<p>{requiredMortgage.toLocaleString("en")}</p>
							{/if}
						</div>
					</div>
					<div class="row">
						<div class="col left">Loan-to-Value:</div>
						<div class="col right">
							<span id="yield">{ltv || ""}</span>%
						</div>
					</div>
					<div class="row">
						<div class="col left">Annual Rental Income:</div>
						<div class="col right">
							{#if !annualRentalIncome}
								<p>£</p>
							{:else}
								<p>
									£{annualRentalIncome.toLocaleString("en")}
								</p>
							{/if}
						</div>
					</div>
				</div>
				<!-- End of General Input and Output -->
				<!-- Beginning Additional Input and Output -->
				<h3>Additional Calculations*</h3>
				<p id="additional-fyi">
					*Calculations exclude house price, deposit and stamp duty on
					the assumption that these will be covered in the re-sale
					revenue at the end of the investment period.
				</p>
				<!-- Beginning Additional Input -->
				<div class="calc calc-input">
					<div class="section">
						<div class="section-top">
							<p class="name">
								Estimated Fees (e.g. legal fees, bank fees,
								surveyor's fees, etc.)
							</p>
						</div>
						<div class="section-bottom">
							<p>£</p>
							<input
								type="number"
								id="fees"
								placeholder="10,000"
								bind:value={fees}
							/>
						</div>
						<div class="section">
							<div class="section-top">
								<p class="name">Esimated One-Off Costs</p>
							</div>
							<div class="section-bottom">
								<p>£</p>
								<input
									type="number"
									id="oneOffCost"
									placeholder="1,000"
									bind:value={oneOffCost}
								/>
							</div>
						</div>
						<div class="section">
							<div class="section-top">
								<p class="name">
									Esimated Monthly Mortgage Payment
								</p>
							</div>
							<div class="section-bottom">
								<p>£</p>
								<input
									type="number"
									id="monthlyMortgage"
									placeholder="200"
									bind:value={monthlyMortgage}
								/>
							</div>
						</div>
						<div class="section">
							<div class="section-top">
								<p class="name">Esimated Monthly Costs</p>
							</div>
							<div class="section-bottom">
								<p>£</p>
								<input
									type="number"
									id="monthlyCosts"
									placeholder="50"
									bind:value={monthlyCosts}
								/>
							</div>
						</div>
					</div>
				</div>
				<!-- Beginning Additional Output-->
				<div class="calc calc-output">
					<div class="row">
						<div class="col left">Estimated Monthly Profit:</div>
						<div class="col right">
							{#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}
								<p>£{monthlyProfit.toLocaleString("en")}</p>
							{:else}
								<p class="output-warning">
									Enter monthly rental income, estimated
									monthly mortgage payment and/or estimated
									monthly costs to continue
								</p>
							{/if}
						</div>
					</div>
					<div class="row">
						<div class="col left">Estimated Annual Profit:</div>
						<div class="col right">
							{#if !monthlyProfit}
								<p class="output-warning">Same as above</p>
							{:else}
								<p>£{annualProfit.toLocaleString("en")}</p>
							{/if}
						</div>
					</div>
					<div class="row">
						<div class="col left">Break-Even:</div>
						<div class="col right">
							{#if annualProfit && fees && oneOffCost}
								<p>
									Estimated at least {breakEven || 1} year(s)
								</p>
							{:else}
								<p class="output-warning">
									Enter monthly rental income and all
									additional calculation fields to continue
								</p>
							{/if}
						</div>
					</div>
				</div>
				<!-- End of Additional Input andd Output-->
			</div>
			<!-- End of All Input and Output -->
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

	h3 {
		padding: 2rem 0 0.5rem 0;
	}

	#additional-fyi {
		line-height: 130%;
		padding: 0.5rem 0;
		font-weight: 300;
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
		font-weight: 300;
	}

	.notes p {
		line-height: 125%;
	}

	.notes ul {
		padding: 0.25rem 0;
	}

	.notes li {
		padding: 0.25rem 0;
	}

	.message {
		margin: 1rem auto;
		background-color: var(--light-green);
		color: var(--matte-green);
		border-radius: 5px;
		padding: 0.5rem 1rem;
		max-width: fit-content;
		line-height: 125%;
	}

	.warning {
		margin: 1rem auto;
		background-color: var(--light-orange);
		color: var(--matte-orange);
		border-radius: 5px;
		padding: 0.5rem 1rem;
		max-width: fit-content;
		line-height: 125%;
	}

	.output-warning {
		color: var(--matte-orange);
	}

	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 0;
	}

	.section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
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
		flex: 1 1 0%;
		border: 1px solid gray;
		border-radius: 5px;
		margin: 0.5rem auto;
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
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
		h1 {
			font-size: 4rem;
		}

		.notes {
			margin: 0 2rem;
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
			flex-direction: column;
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
	}
</style>
