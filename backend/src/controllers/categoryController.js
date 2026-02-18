import { Category, Question, AuditLog } from '../models/index.js';
import AppError from '../utils/AppError.js';

// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Admin
export const getCategories = async (req, res, next) => {
  try {
    const { tree } = req.query;

    if (tree === 'true') {
      const categoryTree = await Category.getCategoryTree();
      return res.json({
        success: true,
        data: { categories: categoryTree },
      });
    }

    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ subject: 1, name: 1 });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category by ID
// @route   GET /api/admin/categories/:id
// @access  Admin
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name')
      .populate('subcategories');

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    res.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/admin/categories
// @access  Admin
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, subject, parent, color } = req.body;
    const categorySubject = subject || 'General';

    // Check for duplicate
    const existing = await Category.findOne({ name, subject: categorySubject });
    if (existing) {
      throw new AppError('Category with this name already exists in this subject', 400);
    }

    const category = await Category.create({
      name,
      description,
      subject: categorySubject,
      parent: parent || null,
      color,
      createdBy: req.user._id,
    });

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'category-create',
      targetType: 'category',
      targetId: category._id,
      details: { name, subject },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Admin
export const updateCategory = async (req, res, next) => {
  try {
    const { name, description, subject, parent, color, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Check if trying to set itself as parent
    if (parent && parent === req.params.id) {
      throw new AppError('Category cannot be its own parent', 400);
    }

    // Update fields
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (subject !== undefined) category.subject = subject;
    if (parent !== undefined) category.parent = parent || null;
    if (color !== undefined) category.color = color;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'category-update',
      targetType: 'category',
      targetId: category._id,
      details: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Admin
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Check if category has questions
    const questionCount = await Question.countDocuments({ category: category._id });
    if (questionCount > 0) {
      throw new AppError(
        `Cannot delete category with ${questionCount} questions. Move or delete questions first.`,
        400
      );
    }

    // Check if category has subcategories
    const subCount = await Category.countDocuments({ parent: category._id });
    if (subCount > 0) {
      throw new AppError(
        'Cannot delete category with subcategories. Delete subcategories first.',
        400
      );
    }

    await category.deleteOne();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'category-delete',
      targetType: 'category',
      targetId: category._id,
      details: { name: category.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get questions in category
// @route   GET /api/admin/categories/:id/questions
// @access  Admin
export const getCategoryQuestions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, difficulty } = req.query;

    const query = { category: req.params.id, isActive: true };
    if (difficulty) query.difficulty = difficulty;

    const questions = await Question.find(query)
      .populate('exam', 'title status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subjects (unique subjects from categories)
// @route   GET /api/admin/subjects
// @access  Admin
export const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Category.distinct('subject', { isActive: true });

    res.json({
      success: true,
      data: { subjects: subjects.sort() },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryQuestions,
  getSubjects,
};
