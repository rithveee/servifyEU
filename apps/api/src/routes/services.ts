import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  date: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  locale: z.enum(['en', 'de', 'fr', 'nl', 'es']).default('en'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export const serviceRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /services/categories
  fastify.get('/categories', async (request, reply) => {
    const locale = (request.headers['accept-language']?.split(',')[0]?.split('-')[0]) ?? 'en'
    const validLocales = ['en', 'de', 'fr', 'nl', 'es']
    const safeLocale = validLocales.includes(locale) ? locale : 'en'

    const categories = await fastify.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: {
          where: { locale: safeLocale },
        },
        _count: { select: { services: { where: { isActive: true } } } },
      },
    })

    const result = categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      serviceCount: cat._count.services,
      name: cat.translations[0]?.name ?? cat.slug,
      description: cat.translations[0]?.description,
    }))

    return reply.send({ success: true, data: result })
  })

  // GET /services/categories/:slug
  fastify.get<{ Params: { slug: string } }>('/categories/:slug', async (request, reply) => {
    const locale = (request.headers['accept-language']?.split(',')[0]?.split('-')[0]) ?? 'en'
    const validLocales = ['en', 'de', 'fr', 'nl', 'es']
    const safeLocale = validLocales.includes(locale) ? locale : 'en'

    const category = await fastify.prisma.serviceCategory.findUnique({
      where: { slug: request.params.slug, isActive: true },
      include: {
        translations: { where: { locale: safeLocale } },
        services: {
          where: { isActive: true },
          include: {
            translations: { where: { locale: safeLocale } },
            _count: { select: { providerServices: { where: { isActive: true } } } },
          },
          orderBy: { basePrice: 'asc' },
        },
      },
    })

    if (!category) return reply.status(404).send({ success: false, error: 'Category not found' })

    return reply.send({
      success: true,
      data: {
        id: category.id,
        slug: category.slug,
        icon: category.icon,
        name: category.translations[0]?.name ?? category.slug,
        description: category.translations[0]?.description,
        services: category.services.map((s) => ({
          id: s.id,
          slug: s.slug,
          basePrice: s.basePrice,
          currency: s.currency,
          durationMinutes: s.durationMinutes,
          pricingType: s.pricingType,
          providerCount: s._count.providerServices,
          name: s.translations[0]?.name ?? s.slug,
          description: s.translations[0]?.description ?? '',
          includes: s.translations[0]?.includes ?? [],
        })),
      },
    })
  })

  // GET /services/:slug
  fastify.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const locale = (request.headers['accept-language']?.split(',')[0]?.split('-')[0]) ?? 'en'
    const validLocales = ['en', 'de', 'fr', 'nl', 'es']
    const safeLocale = validLocales.includes(locale) ? locale : 'en'

    const service = await fastify.prisma.service.findUnique({
      where: { slug: request.params.slug, isActive: true },
      include: {
        translations: { where: { locale: safeLocale } },
        category: { include: { translations: { where: { locale: safeLocale } } } },
        addons: {
          where: { isActive: true },
          include: { translations: { where: { locale: safeLocale } } },
        },
        _count: { select: { providerServices: { where: { isActive: true } } } },
      },
    })

    if (!service) return reply.status(404).send({ success: false, error: 'Service not found' })

    return reply.send({
      success: true,
      data: {
        id: service.id,
        slug: service.slug,
        basePrice: service.basePrice,
        currency: service.currency,
        durationMinutes: service.durationMinutes,
        pricingType: service.pricingType,
        vatRate: service.vatRate,
        providerCount: service._count.providerServices,
        name: service.translations[0]?.name ?? service.slug,
        description: service.translations[0]?.description ?? '',
        whatToExpect: service.translations[0]?.whatToExpect,
        includes: service.translations[0]?.includes ?? [],
        category: {
          slug: service.category.slug,
          name: service.category.translations[0]?.name ?? service.category.slug,
        },
        addons: service.addons.map((a) => ({
          id: a.id,
          slug: a.slug,
          price: a.price,
          name: a.translations[0]?.name ?? a.slug,
        })),
      },
    })
  })

  // GET /services/search
  fastify.get('/search', async (request, reply) => {
    const params = searchSchema.safeParse(request.query)
    if (!params.success) {
      return reply.status(400).send({ success: false, error: 'Invalid query parameters' })
    }

    const { q, city, locale, page, pageSize } = params.data

    // Basic text search using Prisma (can be upgraded to Meilisearch)
    const where: any = { isActive: true }

    const services = await fastify.prisma.service.findMany({
      where,
      include: {
        translations: { where: { locale } },
        category: { include: { translations: { where: { locale } } } },
        _count: { select: { providerServices: { where: { isActive: true } } } },
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    })

    const total = await fastify.prisma.service.count({ where })

    // Filter by name if search query provided
    const filtered = q
      ? services.filter((s) =>
          s.translations[0]?.name.toLowerCase().includes(q.toLowerCase()) ||
          s.translations[0]?.description.toLowerCase().includes(q.toLowerCase())
        )
      : services

    return reply.send({
      success: true,
      data: filtered.map((s) => ({
        id: s.id,
        slug: s.slug,
        basePrice: s.basePrice,
        currency: s.currency,
        durationMinutes: s.durationMinutes,
        providerCount: s._count.providerServices,
        name: s.translations[0]?.name ?? s.slug,
        description: s.translations[0]?.description ?? '',
        category: {
          slug: s.category.slug,
          name: s.category.translations[0]?.name ?? s.category.slug,
          icon: s.category.icon,
        },
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  })
}
