import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    subject: {
      type: String,
      trim: true,
      default: 'General',
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    color: {
      type: String,
      default: '#3b82f6', // Blue default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    questionCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
categorySchema.index({ name: 1, subject: 1 }, { unique: true, sparse: true });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ createdAt: -1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

// Static method to update question count
categorySchema.statics.updateQuestionCount = async function (categoryId) {
  const Question = mongoose.model('Question');
  const count = await Question.countDocuments({ category: categoryId, isActive: true });
  await this.findByIdAndUpdate(categoryId, { questionCount: count });
};

// Get category tree
categorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find({ isActive: true }).lean();
  
  const buildTree = (parentId = null) => {
    return categories
      .filter(cat => (cat.parent?.toString() || null) === (parentId?.toString() || null))
      .map(cat => ({
        ...cat,
        children: buildTree(cat._id),
      }));
  };
  
  return buildTree();
};

const Category = mongoose.model('Category', categorySchema);

export default Category;
