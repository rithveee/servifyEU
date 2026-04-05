import { PrismaClient } from '@prisma/client'

export async function getBookingTool(
  input: { booking_number?: string; use_most_recent?: boolean },
  userId: string | undefined,
  prisma: PrismaClient
): Promise<object> {
  try {
    let booking = null

    if (input.booking_number) {
      booking = await prisma.booking.findFirst({
        where: { bookingNumber: input.booking_number },
        include: {
          service: { include: { translations: { where: { locale: 'en' } } } },
          provider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          address: true,
          review: true,
        },
      })
    } else if (input.use_most_recent && userId) {
      booking = await prisma.booking.findFirst({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          service: { include: { translations: { where: { locale: 'en' } } } },
          provider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          address: true,
          review: true,
        },
      })
    }

    if (!booking) {
      return { found: false, message: 'No booking found with that reference.' }
    }

    // Verify ownership
    if (userId && booking.customerId !== userId) {
      return { found: false, message: 'Booking not found for this customer.' }
    }

    const service = booking.service.translations[0]

    return {
      found: true,
      booking_id: booking.id,
      booking_number: booking.bookingNumber,
      status: booking.status,
      service: service?.name ?? booking.service.slug,
      scheduled_at: booking.scheduledAt.toISOString(),
      scheduled_end_at: booking.scheduledEndAt.toISOString(),
      address: `${booking.address.line1}, ${booking.address.city}, ${booking.address.postcode}`,
      provider: booking.provider
        ? {
            name: `${booking.provider.user.firstName} ${booking.provider.user.lastName}`,
            phone: booking.provider.user.phone,
          }
        : null,
      total_amount: booking.totalAmount,
      currency: booking.currency,
      payment_status: booking.paymentStatus,
      has_review: !!booking.review,
    }
  } catch (error) {
    return { found: false, message: 'Error looking up booking. Please try again.' }
  }
}
