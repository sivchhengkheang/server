import Students from '../models/student-schema.js';

// GET ALL USERS: Fetch all users (usually admin only)
export const getStudents = async (req, res) => {
    try {
        const students = await Students.find({}, '-password'); // Exclude passwords
        res.status(200).json(students);
    } catch (err) {
        console.error('Fetch students error:', err);
        res.status(500).json({ message: 'Error fetching students' });
    }
};

// GET PROFILE: Fetch details of a single user
export const getProfile = async (req, res) => {
    const { id } = req.params;

    try {
        const student = await Students.findById(id, '-password');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.status(200).json(student);
    } catch (err) {
        console.error('Fetch profile error:', err);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

// UPDATE PROFILE: Modify user details
export const updateProfile = async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;

    try {
        const updatedStudent = await Students.findByIdAndUpdate(
            id,
            { name, email, role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.status(200).json({ message: 'Profile updated successfully', student: updatedStudent });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

