import { Email, UUID } from '../VO';
import { Entity, ValueObject } from '../entities';

export interface IInviteProps {
	recipient: Email;
	condominiumId: UUID;
	memberId: UUID;
	code: string;
	createdAt: Date;
}

export interface IInputPropsInvite {
	recipient: string;
	condominiumId: string;
	memberId: string;
	code: string;
	createdAt?: Date;
}

export class Invite implements Entity {
	private readonly props: IInviteProps;
	private readonly _id: UUID;

	constructor(input: IInputPropsInvite, id?: string) {
		this.props = {
			recipient: new Email(input.recipient),
			condominiumId: new UUID(input.condominiumId),
			memberId: new UUID(input.memberId),
			code: input.code,
			createdAt: input.createdAt ?? new Date(),
		};
		this._id = id ? new UUID(id) : UUID.genV4();
	}

	dereference(): Invite {
		return new Invite(
			{
				condominiumId: this.condominiumId.value,
				memberId: this.memberId.value,
				code: this.code,
				recipient: this.recipient.value,
				createdAt: this.createdAt,
			},
			this.id.value,
		);
	}

	equalTo(input: Invite): boolean {
		return (
			input instanceof Invite &&
			input.createdAt === this.createdAt &&
			input.code === this.code &&
			ValueObject.compare(input.id, this.id) &&
			ValueObject.compare(input.condominiumId, this.condominiumId) &&
			ValueObject.compare(input.memberId, this.memberId) &&
			ValueObject.compare(input.recipient, this.recipient)
		);
	}

	get recipient(): Email {
		return this.props.recipient;
	}
	get code(): string {
		return this.props.code;
	}
	get condominiumId(): UUID {
		return this.props.condominiumId;
	}
	get memberId(): UUID {
		return this.props.memberId;
	}
	get id(): UUID {
		return this._id;
	}
	get createdAt(): Date {
		return this.props.createdAt;
	}
}
