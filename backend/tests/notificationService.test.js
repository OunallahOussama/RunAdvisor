jest.mock('../models/Notification', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn()
}));

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connection: { readyState: 1 }
  };
});

const Notification = require('../models/Notification');
const {
  createNotification,
  listForUser,
  countUnread,
  markRead,
  markAllRead
} = require('../services/notificationService');

describe('notificationService', () => {
  beforeEach(() => {
    Notification.create.mockReset();
    Notification.find.mockReset();
    Notification.countDocuments.mockReset();
    Notification.findOneAndUpdate.mockReset();
    Notification.updateMany.mockReset();
  });

  describe('createNotification', () => {
    it('returns null when userId is missing without calling create', async () => {
      const result = await createNotification(null, { title: 'x' });
      expect(result).toBeNull();
      expect(Notification.create).not.toHaveBeenCalled();
    });

    it('passes title/body/severity through to Notification.create', async () => {
      Notification.create.mockResolvedValue({ _id: 'n1', readAt: null });

      const result = await createNotification('user-1', {
        type: 'weekly_report_ready',
        title: 'Your weekly report is ready',
        body: 'You ran 4 times for 32.4 km.',
        severity: 'success',
        data: { route: '/' }
      });

      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        type: 'weekly_report_ready',
        title: 'Your weekly report is ready',
        body: 'You ran 4 times for 32.4 km.',
        severity: 'success',
        data: { route: '/' }
      }));
      expect(result).toEqual({ _id: 'n1', readAt: null });
    });

    it('swallows DB errors and returns null', async () => {
      Notification.create.mockRejectedValue(new Error('boom'));
      const result = await createNotification('user-1', { title: 'x' });
      expect(result).toBeNull();
    });
  });

  describe('listForUser', () => {
    it('returns up to `limit` newest notifications, filtered by unread when requested', async () => {
      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const leanMock = jest.fn().mockResolvedValue([{ _id: 'n1' }]);
      Notification.find.mockReturnValue({
        sort: sortMock,
        limit: limitMock,
        lean: leanMock
      });

      const result = await listForUser('user-1', { unreadOnly: true, limit: 5 });
      expect(Notification.find).toHaveBeenCalledWith({ userId: 'user-1', readAt: null });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(limitMock).toHaveBeenCalledWith(5);
      expect(result).toEqual([{ _id: 'n1' }]);
    });
  });

  describe('countUnread', () => {
    it('queries readAt: null', async () => {
      Notification.countDocuments.mockResolvedValue(3);
      const result = await countUnread('user-1');
      expect(Notification.countDocuments).toHaveBeenCalledWith({ userId: 'user-1', readAt: null });
      expect(result).toBe(3);
    });
  });

  describe('markRead', () => {
    it('flips readAt to now for the given id+user', async () => {
      const doc = { _id: 'n1', readAt: new Date() };
      Notification.findOneAndUpdate.mockResolvedValue(doc);

      const result = await markRead('user-1', 'n1');
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'n1', userId: 'user-1' },
        expect.objectContaining({ readAt: expect.any(Date) }),
        expect.objectContaining({ new: true })
      );
      expect(result.readAt).toBeInstanceOf(Date);
    });
  });

  describe('markAllRead', () => {
    it('updates every unread notification for the user', async () => {
      Notification.updateMany.mockResolvedValue({ modifiedCount: 4 });
      const result = await markAllRead('user-1');
      expect(Notification.updateMany).toHaveBeenCalledWith(
        { userId: 'user-1', readAt: null },
        expect.objectContaining({ readAt: expect.any(Date) })
      );
      expect(result.modifiedCount).toBe(4);
    });
  });
});
