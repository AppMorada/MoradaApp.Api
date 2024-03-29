export class DateFormats {
	/**
	 * Formata a data para ser mostrado, por exemplo, em logs
	 * @param date - Deve conter a data a ser formatada
	 **/
	static prettify(date: Date): string {
		const rawSeconds = date.getUTCSeconds();
		const rawMinutes = date.getUTCMinutes();
		const rawHours = date.getUTCHours();

		const seconds = rawSeconds > 9 ? rawSeconds : `0${rawSeconds}`;
		const minutes = rawMinutes > 9 ? rawMinutes : `0${rawMinutes}`;
		const hours = rawHours > 9 ? rawHours : `0${rawHours}`;

		return `${hours}:${minutes}:${seconds} UTC`;
	}
}
