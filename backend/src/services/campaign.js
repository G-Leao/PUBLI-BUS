import prisma from '../config/prisma.js';

export const campaignService = {
  async list(advertiserId = null) {
    const where = advertiserId ? { advertiser: { id: advertiserId } } : {};
    return prisma.campaign.findMany({
      where,
      include: { advertiser: true, media: true, campaignBuses: { include: { bus: true } }, campaignSpaces: { include: { advertisingSpace: true } } },
    });
  },

  async getById(id, advertiserId = null) {
    const where = { id };
    if (advertiserId) {
      where.advertiser = { id: advertiserId };
    }
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { advertiser: true, media: true, campaignBuses: { include: { bus: true } }, campaignSpaces: { include: { advertisingSpace: true } }, impressions: true },
    });
    if (!campaign) throw new Error('Campaign not found');
    if (advertiserId && campaign.advertiser.id !== advertiserId) throw new Error('Access denied');
    return campaign;
  },

  async create(data) {
    return prisma.campaign.create({
      data,
      include: { advertiser: true, media: true },
    });
  },

  async update(id, data) {
    return prisma.campaign.update({
      where: { id },
      data,
      include: { advertiser: true, media: true },
    });
  },

  async delete(id) {
    return prisma.campaign.delete({ where: { id } });
  },

  async updateStatus(id, status) {
    return prisma.campaign.update({
      where: { id },
      data: { status },
      include: { advertiser: true, media: true },
    });
  },
};
