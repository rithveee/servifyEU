import { PrismaClient } from '@prisma/client'
import { getCancellationRefundPercent } from '@servify/shared-utils'

export async function cancelBookingTool(
  input: {
    booking_id: string
    reason: string
    reason_detail?: string
    customer_confirmed: boolean
  },
  userId: string | undefined,
  prisma: PrismaClient
): Promise<object> {
  if (!input.customer_confirmed) {
    return {
      success: false,
      message: 'Cancellation not confirmed by customer. Please ask the customer to confirm before proceeding.',
    }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.booking_id },
  })

  if (!booking) {
    return { success: false, message: 'Booking not found.' }
  }

  if (userId && booking.customerId !== userId) {
    return { success: false, message: 'This booking does not belong to the current customer.' }
  }

  const nonCancellableStatuses = ['COMPLETED', 'CANCELLED_CUSTOMER', 'CANCELLED_PROVIDER', 'CANCELLED_ADMIN']
  if (nonCancellableStatuses.includes(booking.status)) {
    return {
      success: false,
      message: `Booking cannot be cancelled — it is already ${booking.status.toLowerCase().replace('_', ' ')}.`,
    }
  }

  const refundPercent = getCancellationRefundPercent(booking.scheduledAt)
  const refundAmount = (Number(booking.totalAmount) * refundPercent) / 100

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED_CUSTOMER',
        cancellationReason: input.reason_detail ?? input.reason,
        paymentStatus: refundPercent > 0 ? 'REFUNDED' : booking.paymentStatus,
      },
    }),
    prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        status: 'CANCELLED_CUSTOMER',
        note: `Cancelled via AI agent. Reason: ${input.reason}`,
        changedById: userId,
      },
    }),
  ])

  return {
    success: true,
    booking_number: booking.bookingNumber,
    refund_percent: refundPercent,
    refund_amount: refundAmount,
    currency: booking.currency,
    message:
      refundPercent === 100
        ? `Booking cancelled. A full refund of ${refundAmount} ${booking.currency} will be processed within 5-10 business days.`
        : refundPercent === 50
          ? `Booking cancelled. A 50% refund of ${refundAmount} ${booking.currency} will be processed within 5-10 business days.`
          : `Booking cancelled. No refund applies as the booking was cancelled within 24 hours.`,
  }
}
